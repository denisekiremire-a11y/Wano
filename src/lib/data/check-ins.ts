import { randomInt } from "crypto";
import { and, asc, eq, gt, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  listings,
  travellerProfiles,
  vendorProfiles,
  venueCheckIns,
  visitorCodeFailures,
  visitorCodes,
  weeklyChallengeCompletions,
  weeklyChallenges,
} from "@/db/schema";
import { areaForLocation, STAMP_AREAS } from "@/lib/areas";
import { kampalaDateIso } from "@/lib/drops";
import { kampalaWeekBounds, kampalaWeekStartIso } from "@/lib/kampala-time";
import { computeStreak } from "@/lib/streaks";
import {
  challengeProgress,
  defaultChallengesForWeek,
  type ChallengeRule,
  type CheckInFact,
} from "@/lib/weekly-challenges";

export const VISITOR_CODE_TTL_MS = 10 * 60 * 1000;

/** This week's three challenges, created from the defaults the first time
 * anyone needs them. */
export async function ensureWeekChallenges(weekStartIso: string) {
  const existing = await db
    .select()
    .from(weeklyChallenges)
    .where(eq(weeklyChallenges.weekStart, weekStartIso))
    .orderBy(asc(weeklyChallenges.slot));
  if (existing.length >= 3) return sortSlots(existing);

  await db
    .insert(weeklyChallenges)
    .values(defaultChallengesForWeek(weekStartIso).map((t) => ({ weekStart: weekStartIso, ...t })))
    .onConflictDoNothing();
  return sortSlots(await db.select().from(weeklyChallenges).where(eq(weeklyChallenges.weekStart, weekStartIso)));
}

const SLOT_ORDER = { easy: 0, explore: 1, theme: 2 } as Record<string, number>;
function sortSlots<T extends { slot: string }>(rows: T[]) {
  return [...rows].sort((a, b) => (SLOT_ORDER[a.slot] ?? 9) - (SLOT_ORDER[b.slot] ?? 9));
}

async function listingTypesByVendor(vendorIds: string[]) {
  const map = new Map<string, string[]>();
  if (vendorIds.length === 0) return map;
  const rows = await db
    .select({ vendorProfileId: listings.vendorProfileId, type: listings.type })
    .from(listings)
    .where(and(inArray(listings.vendorProfileId, vendorIds), eq(listings.active, true)));
  for (const r of rows) map.set(r.vendorProfileId, [...(map.get(r.vendorProfileId) ?? []), r.type]);
  return map;
}

/** The member's check-ins this week as rule facts, plus every venue they
 * had checked in at before the week began. */
async function weekFacts(travellerId: string, weekStartIso: string) {
  const { start, end } = kampalaWeekBounds(weekStartIso);
  const [thisWeek, before] = await Promise.all([
    db
      .select({ vendorProfileId: venueCheckIns.vendorProfileId, area: venueCheckIns.area })
      .from(venueCheckIns)
      .where(
        and(eq(venueCheckIns.travellerId, travellerId), gte(venueCheckIns.checkedInAt, start), lt(venueCheckIns.checkedInAt, end)),
      ),
    db
      .selectDistinct({ vendorProfileId: venueCheckIns.vendorProfileId })
      .from(venueCheckIns)
      .where(and(eq(venueCheckIns.travellerId, travellerId), lt(venueCheckIns.checkedInAt, start))),
  ]);
  const types = await listingTypesByVendor([...new Set(thisWeek.map((c) => c.vendorProfileId))]);
  const facts: CheckInFact[] = thisWeek.map((c) => ({ ...c, listingTypes: types.get(c.vendorProfileId) ?? [] }));
  return { facts, seenBefore: new Set(before.map((b) => b.vendorProfileId)) };
}

/** The member's three challenges this week with progress, for the Passport. */
export async function getWeeklyChallengeStatus(travellerId: string, now = new Date()) {
  const weekStart = kampalaWeekStartIso(now);
  const [challenges, { facts, seenBefore }] = await Promise.all([
    ensureWeekChallenges(weekStart),
    weekFacts(travellerId, weekStart),
  ]);
  const completions = await db
    .select({ id: weeklyChallengeCompletions.weeklyChallengeId })
    .from(weeklyChallengeCompletions)
    .where(
      and(
        eq(weeklyChallengeCompletions.travellerId, travellerId),
        inArray(
          weeklyChallengeCompletions.weeklyChallengeId,
          challenges.map((c) => c.id),
        ),
      ),
    );
  const doneIds = new Set(completions.map((c) => c.id));
  return challenges.map((c) => {
    const p = challengeProgress(c.rule as ChallengeRule, facts, seenBefore);
    return { challenge: c, ...p, done: doneIds.has(c.id) || p.done };
  });
}

/** Neighbourhoods the member has a verified visit in. */
export async function getAreaStamps(travellerId: string, since?: Date) {
  const rows = await db
    .selectDistinct({ area: venueCheckIns.area })
    .from(venueCheckIns)
    .where(and(eq(venueCheckIns.travellerId, travellerId), since ? gte(venueCheckIns.checkedInAt, since) : undefined));
  const areas = new Set(rows.map((r) => r.area).filter((a): a is string => Boolean(a)));
  return STAMP_AREAS.filter((a) => areas.has(a));
}

/** How many neighbourhood stamps the member first earned on or after
 * `since` (all of them when no date is given). */
export async function countAreaStampsEarned(travellerId: string, since?: Date) {
  const rows = await db
    .select({ area: venueCheckIns.area, first: sql<Date>`min(${venueCheckIns.checkedInAt})` })
    .from(venueCheckIns)
    .where(and(eq(venueCheckIns.travellerId, travellerId), sql`${venueCheckIns.area} is not null`))
    .groupBy(venueCheckIns.area);
  return rows.filter((r) => !since || new Date(r.first) >= since).length;
}

/** Friends this member invited who have made their first verified visit
 * (on or after `since` when given). Each pays the inviter XP. */
export async function countInvitedFriendsVisited(travellerId: string, since?: Date) {
  const rows = await db
    .select({ first: sql<Date>`min(${venueCheckIns.checkedInAt})` })
    .from(venueCheckIns)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, venueCheckIns.travellerId))
    .where(eq(travellerProfiles.referredByTravellerId, travellerId))
    .groupBy(venueCheckIns.travellerId);
  return rows.filter((r) => !since || new Date(r.first) >= since).length;
}

/** The member's weekly streak (see src/lib/streaks.ts). */
export async function getStreakStatus(travellerId: string, now = new Date()) {
  const rows = await db
    .selectDistinct({ day: venueCheckIns.kampalaDate })
    .from(venueCheckIns)
    .where(eq(venueCheckIns.travellerId, travellerId));
  const weeks = rows.map((r) => kampalaWeekStartIso(new Date(`${r.day}T12:00:00+03:00`)));
  return computeStreak(weeks, kampalaWeekStartIso(now));
}

/** XP from streak milestones reached (in weeks starting on or after `since`). */
export async function getStreakXp(travellerId: string, since?: Date) {
  const { milestones } = await getStreakStatus(travellerId);
  const sinceIso = since ? kampalaWeekStartIso(since) : null;
  const counted = milestones.filter((m) => !sinceIso || m.weekStart >= sinceIso);
  return { count: counted.length, xp: counted.reduce((sum, m) => sum + m.xp, 0) };
}

/** XP from weekly challenges completed (optionally since a date). */
export async function getWeeklyChallengeXp(travellerId: string, since?: Date) {
  const [row] = await db
    .select({ xp: sql<number>`coalesce(sum(${weeklyChallenges.xp}), 0)::int`, n: sql<number>`count(*)::int` })
    .from(weeklyChallengeCompletions)
    .innerJoin(weeklyChallenges, eq(weeklyChallengeCompletions.weeklyChallengeId, weeklyChallenges.id))
    .where(
      and(
        eq(weeklyChallengeCompletions.travellerId, travellerId),
        since ? gte(weeklyChallengeCompletions.completedAt, since) : undefined,
      ),
    );
  return { xp: row?.xp ?? 0, count: row?.n ?? 0 };
}

export type CheckInResult = {
  created: boolean;
  newArea: string | null;
  completed: { title: string; xp: number }[];
};

/** Records a verified visit (once per member, venue and Kampala day), then
 * awards any weekly challenge it completes. Safe to call twice. */
export async function recordCheckIn(
  travellerId: string,
  vendorProfileId: string,
  source: "qr" | "code",
  now = new Date(),
): Promise<CheckInResult> {
  const [vendor] = await db
    .select({ location: vendorProfiles.location })
    .from(vendorProfiles)
    .where(eq(vendorProfiles.id, vendorProfileId))
    .limit(1);
  const area = areaForLocation(vendor?.location);
  const hadArea = area ? (await getAreaStamps(travellerId)).includes(area as never) : true;

  const inserted = await db
    .insert(venueCheckIns)
    .values({ travellerId, vendorProfileId, kampalaDate: kampalaDateIso(now), area, source, checkedInAt: now })
    .onConflictDoNothing()
    .returning({ id: venueCheckIns.id });
  if (inserted.length === 0) return { created: false, newArea: null, completed: [] };

  const status = await getWeeklyChallengeStatus(travellerId, now);
  const completed: { title: string; xp: number }[] = [];
  for (const s of status) {
    if (!s.done) continue;
    const won = await db
      .insert(weeklyChallengeCompletions)
      .values({ travellerId, weeklyChallengeId: s.challenge.id, completedAt: now })
      .onConflictDoNothing()
      .returning({ id: weeklyChallengeCompletions.id });
    if (won.length > 0) completed.push({ title: s.challenge.title, xp: s.challenge.xp });
  }
  return { created: true, newArea: area && !hadArea ? area : null, completed };
}

/** A fresh 6-digit backup code for the member's QR, or their current one
 * if it still has more than two minutes left. */
export async function issueVisitorCode(travellerId: string, now = new Date()) {
  const [current] = await db
    .select()
    .from(visitorCodes)
    .where(
      and(eq(visitorCodes.travellerId, travellerId), gt(visitorCodes.expiresAt, new Date(now.getTime() + 2 * 60 * 1000))),
    )
    .limit(1);
  if (current) return current;

  await db.delete(visitorCodes).where(lt(visitorCodes.expiresAt, now));
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = String(randomInt(100000, 1000000));
    const [row] = await db
      .insert(visitorCodes)
      .values({ travellerId, code, expiresAt: new Date(now.getTime() + VISITOR_CODE_TTL_MS) })
      .onConflictDoNothing()
      .returning();
    if (row) return row;
  }
  throw new Error("Could not create a visitor code.");
}

export const CODE_FAILURE_LIMIT = 10;
const CODE_FAILURE_WINDOW_MS = 15 * 60 * 1000;

/** The member a code typed at a venue belongs to. A venue that types
 * CODE_FAILURE_LIMIT wrong codes in 15 minutes is paused, so codes can't
 * be guessed by trying them all. */
export async function resolveVisitorCodeForVendor(
  vendorProfileId: string,
  rawCode: string,
  now = new Date(),
): Promise<{ travellerId: string } | { error: "invalid" | "paused" }> {
  const [recent] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(visitorCodeFailures)
    .where(
      and(
        eq(visitorCodeFailures.vendorProfileId, vendorProfileId),
        gt(visitorCodeFailures.createdAt, new Date(now.getTime() - CODE_FAILURE_WINDOW_MS)),
      ),
    );
  if ((recent?.n ?? 0) >= CODE_FAILURE_LIMIT) return { error: "paused" };

  const travellerId = await resolveVisitorCode(rawCode, now);
  if (travellerId) return { travellerId };
  await db.insert(visitorCodeFailures).values({ vendorProfileId, createdAt: now });
  return { error: "invalid" };
}

/** The member a typed code belongs to, if it is still valid. */
async function resolveVisitorCode(rawCode: string, now: Date) {
  const code = rawCode.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return null;
  const [row] = await db
    .select({ travellerId: visitorCodes.travellerId })
    .from(visitorCodes)
    .where(and(eq(visitorCodes.code, code), gt(visitorCodes.expiresAt, now)))
    .limit(1);
  return row?.travellerId ?? null;
}
