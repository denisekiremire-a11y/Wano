import { and, asc, count, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { crewMembers, crews, travellerProfiles, venueCheckIns } from "@/db/schema";
import { getAreaStamps, getWeeklyChallengeStatus } from "@/lib/data/check-ins";
import { newInviteToken } from "@/lib/data/plans";
import { getXpEarnedLast12Months } from "@/lib/data/rewards";
import { kampalaWeekBounds, kampalaWeekStartIso } from "@/lib/kampala-time";
import { LAUNCH_AREAS, STAMP_AREAS } from "@/lib/areas";

import { CREW_MAX, CREW_NAME_MAX } from "@/lib/crew-limits";

export { CREW_MAX, CREW_NAME_MAX };

export type CrewMember = { travellerId: string; name: string; role: "owner" | "member"; joinedAt: Date };

export class CrewError extends Error {}

/** The member's crew and everyone in it (owner first), or null. */
export async function getMyCrew(travellerId: string) {
  const [mine] = await db
    .select({ crew: crews })
    .from(crewMembers)
    .innerJoin(crews, eq(crews.id, crewMembers.crewId))
    .where(eq(crewMembers.travellerId, travellerId))
    .limit(1);
  if (!mine) return null;
  return { ...mine.crew, members: await getCrewMembers(mine.crew.id) };
}

export async function getCrewMembers(crewId: string): Promise<CrewMember[]> {
  const rows = await db
    .select({
      travellerId: crewMembers.travellerId,
      name: travellerProfiles.displayName,
      role: crewMembers.role,
      joinedAt: crewMembers.joinedAt,
    })
    .from(crewMembers)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, crewMembers.travellerId))
    .where(eq(crewMembers.crewId, crewId))
    .orderBy(sql`${crewMembers.role} = 'owner' desc`, asc(crewMembers.joinedAt));
  return rows as CrewMember[];
}

/** What an invite link shows before joining: name, owner, size. */
export async function getCrewInvite(token: string) {
  const [crew] = await db.select().from(crews).where(eq(crews.inviteToken, token)).limit(1);
  if (!crew) return null;
  const members = await getCrewMembers(crew.id);
  return { ...crew, members, full: members.length >= CREW_MAX };
}

function cleanName(name: string) {
  const trimmed = name.trim().replace(/\s+/g, " ").slice(0, CREW_NAME_MAX);
  if (!trimmed) throw new CrewError("Give your crew a name.");
  return trimmed;
}

export async function createCrew(travellerId: string, name: string) {
  const crewName = cleanName(name);
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: crewMembers.id })
      .from(crewMembers)
      .where(eq(crewMembers.travellerId, travellerId))
      .limit(1);
    if (existing) throw new CrewError("You're already in a crew. Leave it first to start a new one.");
    const [crew] = await tx
      .insert(crews)
      .values({ name: crewName, inviteToken: newInviteToken(), createdById: travellerId })
      .returning();
    await tx.insert(crewMembers).values({ crewId: crew.id, travellerId, role: "owner" });
    return crew;
  });
}

/** Join by invite link. One crew per person and at most CREW_MAX members;
 * the crew row is locked so two people can't take the last place at once. */
export async function joinCrew(travellerId: string, token: string) {
  return db.transaction(async (tx) => {
    const [crew] = await tx.select().from(crews).where(eq(crews.inviteToken, token)).for("update").limit(1);
    if (!crew) throw new CrewError("This invite link doesn't work any more.");
    const [existing] = await tx
      .select({ crewId: crewMembers.crewId })
      .from(crewMembers)
      .where(eq(crewMembers.travellerId, travellerId))
      .limit(1);
    if (existing?.crewId === crew.id) return crew;
    if (existing) throw new CrewError("You're already in a crew. Leave it first to join this one.");
    const [{ total }] = await tx.select({ total: count() }).from(crewMembers).where(eq(crewMembers.crewId, crew.id));
    if (total >= CREW_MAX) throw new CrewError(`This crew is full (${CREW_MAX} people).`);
    await tx.insert(crewMembers).values({ crewId: crew.id, travellerId, role: "member" });
    return crew;
  });
}

/** Leave the crew. An owner hands over to the longest-standing member; the
 * last person out closes the crew. */
export async function leaveCrew(travellerId: string) {
  await db.transaction(async (tx) => {
    const [mine] = await tx.select().from(crewMembers).where(eq(crewMembers.travellerId, travellerId)).limit(1);
    if (!mine) return;
    await tx.select({ id: crews.id }).from(crews).where(eq(crews.id, mine.crewId)).for("update");
    await tx.delete(crewMembers).where(eq(crewMembers.id, mine.id));
    const [next] = await tx
      .select({ id: crewMembers.id })
      .from(crewMembers)
      .where(eq(crewMembers.crewId, mine.crewId))
      .orderBy(asc(crewMembers.joinedAt))
      .limit(1);
    if (!next) {
      await tx.delete(crews).where(eq(crews.id, mine.crewId));
    } else if (mine.role === "owner") {
      await tx.update(crewMembers).set({ role: "owner" }).where(eq(crewMembers.id, next.id));
    }
  });
}

/** The owner removes someone from the crew. */
export async function removeCrewMember(ownerId: string, memberId: string) {
  if (ownerId === memberId) throw new CrewError("Use 'Leave crew' to leave.");
  const [owner] = await db.select().from(crewMembers).where(eq(crewMembers.travellerId, ownerId)).limit(1);
  if (!owner || owner.role !== "owner") throw new CrewError("Only the crew owner can remove people.");
  await db.delete(crewMembers).where(and(eq(crewMembers.crewId, owner.crewId), eq(crewMembers.travellerId, memberId)));
}

export async function renameCrew(ownerId: string, name: string) {
  const crewName = cleanName(name);
  const [owner] = await db.select().from(crewMembers).where(eq(crewMembers.travellerId, ownerId)).limit(1);
  if (!owner || owner.role !== "owner") throw new CrewError("Only the crew owner can rename the crew.");
  await db.update(crews).set({ name: crewName }).where(eq(crews.id, owner.crewId));
}

/** Fresh invite link, so an old one shared too widely stops working. */
export async function resetCrewInvite(ownerId: string) {
  const [owner] = await db.select().from(crewMembers).where(eq(crewMembers.travellerId, ownerId)).limit(1);
  if (!owner || owner.role !== "owner") throw new CrewError("Only the crew owner can reset the link.");
  await db.update(crews).set({ inviteToken: newInviteToken() }).where(eq(crews.id, owner.crewId));
}

/** The shared Passport: everyone's XP added up, every neighbourhood any
 * member has a stamp in, and how many of the crew finished each of this
 * week's challenges. Read-only: a crew earns no XP of its own. */
export async function getCrewPassport(members: CrewMember[], now = new Date()) {
  const ids = members.map((m) => m.travellerId);
  const { start, end } = kampalaWeekBounds(kampalaWeekStartIso(now));
  const [xp, areas, weekly, visits] = await Promise.all([
    Promise.all(ids.map((id) => getXpEarnedLast12Months(id))),
    Promise.all(ids.map((id) => getAreaStamps(id))),
    Promise.all(ids.map((id) => getWeeklyChallengeStatus(id, now))),
    ids.length === 0
      ? Promise.resolve([])
      : db
          .select({ travellerId: venueCheckIns.travellerId, total: count() })
          .from(venueCheckIns)
          .where(
            and(
              inArray(venueCheckIns.travellerId, ids),
              gte(venueCheckIns.checkedInAt, start),
              lt(venueCheckIns.checkedInAt, end),
            ),
          )
          .groupBy(venueCheckIns.travellerId),
  ]);

  const visitMap = new Map(visits.map((v) => [v.travellerId, v.total]));
  const perMember = members.map((m, i) => ({
    ...m,
    xp: xp[i],
    visitsThisWeek: visitMap.get(m.travellerId) ?? 0,
    challengesDone: weekly[i].filter((c) => c.done).length,
  }));

  const stampedBy = new Map<string, string[]>();
  areas.forEach((list, i) => {
    for (const area of list) stampedBy.set(area, [...(stampedBy.get(area) ?? []), members[i].name]);
  });

  const challenges = (weekly[0] ?? []).map(({ challenge }) => ({
    challenge,
    doneBy: members.filter((_, i) => weekly[i].some((c) => c.challenge.id === challenge.id && c.done)).map((m) => m.name),
  }));

  return {
    totalXp: xp.reduce((a, b) => a + b, 0),
    visitsThisWeek: perMember.reduce((a, m) => a + m.visitsThisWeek, 0),
    goersThisWeek: perMember.filter((m) => m.visitsThisWeek > 0).length,
    members: perMember,
    // Launch neighbourhoods always show; others once someone has a stamp.
    areas: STAMP_AREAS.filter((a) => (LAUNCH_AREAS as readonly string[]).includes(a) || stampedBy.has(a)).map((area) => ({
      area,
      by: stampedBy.get(area) ?? [],
    })),
    challenges,
  };
}
