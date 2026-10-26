import { and, asc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyDrops, listings, rewards, travellerProfiles, userRewards, users, vendorProfiles } from "@/db/schema";
import { withRlsContext, type DbOrTx } from "@/lib/db-context";
import { areaForLocation, type StampArea } from "@/lib/areas";
import {
  DROP_NO_SHOW_WINDOW_DAYS,
  dropPhase,
  isDropAnnounced,
  kampalaDateIso,
  xpDropArea,
  type DropPhase,
} from "@/lib/drops";
import { XP_DROP_XP } from "@/lib/rewards-config";
import { isWhatsappConfigured } from "@/lib/whatsapp";

export type DropView = {
  dropId: string;
  dropDate: string;
  rewardId: string;
  title: string;
  description: string | null;
  discountType: "percent" | "fixed" | "freebie" | "spend_perk" | "points";
  discountValue: string | null;
  listingId: string;
  listingTitle: string;
  vendorName: string;
  vendorProfileId: string;
  cap: number;
  claimed: number;
  redeemed: number;
  claimsOpenAt: Date;
  redeemFrom: Date;
  redeemUntil: Date;
  phase: DropPhase;
};

async function readDrops(client: DbOrTx, where: ReturnType<typeof and>, now: Date): Promise<DropView[]> {
  const rows = await client
    .select({
      drop: dailyDrops,
      reward: rewards,
      listingTitle: listings.title,
      vendorName: vendorProfiles.businessName,
      vendorProfileId: vendorProfiles.id,
      claimed: sql<number>`(select count(*)::int from user_rewards ur where ur.reward_id = ${rewards.id} and ur.status <> 'void')`,
      redeemed: sql<number>`(select count(*)::int from user_rewards ur where ur.reward_id = ${rewards.id} and ur.status = 'redeemed')`,
    })
    .from(dailyDrops)
    .innerJoin(rewards, eq(dailyDrops.rewardId, rewards.id))
    .innerJoin(listings, eq(rewards.targetId, listings.id))
    .innerJoin(vendorProfiles, eq(listings.vendorProfileId, vendorProfiles.id))
    .where(and(where, eq(rewards.active, true), eq(rewards.status, "active")))
    .orderBy(asc(dailyDrops.dropDate));

  return rows.map((r) => ({
    dropId: r.drop.id,
    dropDate: r.drop.dropDate,
    rewardId: r.reward.id,
    title: r.reward.title,
    description: r.reward.description,
    discountType: r.reward.discountType,
    discountValue: r.reward.discountValue,
    listingId: r.reward.targetId,
    listingTitle: r.listingTitle,
    vendorName: r.vendorName,
    vendorProfileId: r.vendorProfileId,
    cap: r.reward.totalCap ?? 0,
    claimed: r.claimed,
    redeemed: r.redeemed,
    claimsOpenAt: r.drop.claimsOpenAt,
    redeemFrom: r.drop.redeemFrom,
    redeemUntil: r.drop.redeemUntil,
    phase: dropPhase(r.drop, now),
  }));
}

/** Drops are a public catalog, but the claim counts read user_rewards,
 * which row-level security limits to the voucher's owner or venue. These
 * are aggregate counts only (no voucher data leaves this function), so
 * they're read in the trusted admin context, same as mintUserReward. */
function readAsSystem<T>(fn: (tx: DbOrTx) => Promise<T>) {
  return withRlsContext({ role: "admin" }, fn);
}

/** Today's Drop (if any) and tomorrow's once it has been announced at
 * 17:00. Before 17:00 tomorrow's Drop stays a surprise. */
export async function getHomeDrops(now = new Date()) {
  const today = kampalaDateIso(now);
  const tomorrow = kampalaDateIso(now, 1);
  const drops = await readAsSystem((tx) => readDrops(tx, and(inArray(dailyDrops.dropDate, [today, tomorrow])), now));
  return {
    today: drops.find((d) => d.dropDate === today && d.phase !== "over") ?? null,
    tomorrow: drops.find((d) => d.dropDate === tomorrow && d.phase !== "announced_soon") ?? null,
  };
}

export async function getDropById(dropId: string, now = new Date()) {
  const [drop] = await readAsSystem((tx) => readDrops(tx, and(eq(dailyDrops.id, dropId)), now));
  return drop ?? null;
}

/** Admin calendar: from a week ago onwards. */
export async function getDropsForAdmin(now = new Date()) {
  return readAsSystem((tx) => readDrops(tx, and(gte(dailyDrops.dropDate, kampalaDateIso(now, -7))), now));
}

/** A vendor's Drop for today, so the venue sees its head count. */
export async function getVendorDropToday(vendorProfileId: string, now = new Date()) {
  const drops = await readAsSystem((tx) =>
    readDrops(tx, and(inArray(dailyDrops.dropDate, [kampalaDateIso(now), kampalaDateIso(now, 1)])), now),
  );
  return drops.filter((d) => d.vendorProfileId === vendorProfileId);
}

export async function getMyDropVoucher(travellerId: string, rewardId: string, userId: string) {
  return withRlsContext({ userId, role: "traveller", travellerProfileId: travellerId }, async (tx) => {
    const [row] = await tx
      .select()
      .from(userRewards)
      .where(and(eq(userRewards.travellerId, travellerId), eq(userRewards.rewardId, rewardId)))
      .limit(1);
    return row ?? null;
  });
}

/** Expiry times of Drop vouchers this member claimed and never used, in
 * the no-show window — the input to dropPausedUntil. */
export async function getDropNoShows(travellerId: string, now = new Date()) {
  const since = new Date(now.getTime() - DROP_NO_SHOW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await readAsSystem((tx) =>
    tx
      .select({ expiresAt: userRewards.expiresAt })
      .from(userRewards)
      .innerJoin(rewards, eq(userRewards.rewardId, rewards.id))
      .where(
        and(
          eq(userRewards.travellerId, travellerId),
          eq(rewards.source, "drop"),
          inArray(userRewards.status, ["claimed", "expired"]),
          isNull(userRewards.redeemedAt),
          gte(userRewards.expiresAt, since),
          lt(userRewards.expiresAt, now),
        ),
      ),
  );
  return rows.map((r) => r.expiresAt);
}

/** Who may claim a Drop: a verified phone when WhatsApp codes can be sent,
 * otherwise a verified email. Stops one person claiming from several
 * accounts without blocking launch on the WhatsApp setup. */
export type DropIdentity = { ok: true } | { ok: false; need: "phone" | "email" };

export async function checkDropIdentity(travellerId: string): Promise<DropIdentity> {
  const [row] = await db
    .select({ phoneVerifiedAt: travellerProfiles.phoneVerifiedAt, emailVerifiedAt: users.emailVerifiedAt })
    .from(travellerProfiles)
    .innerJoin(users, eq(travellerProfiles.userId, users.id))
    .where(eq(travellerProfiles.id, travellerId))
    .limit(1);
  if (!row) return { ok: false, need: "email" };
  if (isWhatsappConfigured()) return row.phoneVerifiedAt ? { ok: true } : { ok: false, need: "phone" };
  return row.emailVerifiedAt ? { ok: true } : { ok: false, need: "email" };
}

/** Of the given Kampala dates, those with a funded Drop that is still on
 * (not cancelled). An XP Drop runs only on the other days. */
export async function getFundedDropDates(dates: string[]): Promise<Set<string>> {
  if (dates.length === 0) return new Set();
  const rows = await db
    .select({ date: dailyDrops.dropDate })
    .from(dailyDrops)
    .innerJoin(rewards, eq(dailyDrops.rewardId, rewards.id))
    .where(and(inArray(dailyDrops.dropDate, dates), eq(rewards.active, true), eq(rewards.status, "active")));
  return new Set(rows.map((r) => r.date));
}

export type XpDropView = { date: string; area: StampArea; xp: number; venues: string[] };

/** The XP Drop for today and, from 17:00, tomorrow, on days without a
 * funded Drop. Names a few verified partners in the area so it's
 * clear where to go. */
export async function getHomeXpDrops(now = new Date()) {
  const today = kampalaDateIso(now);
  const tomorrow = kampalaDateIso(now, 1);
  const dates = isDropAnnounced(now) ? [today, tomorrow] : [today];
  const [funded, partners] = await Promise.all([
    getFundedDropDates(dates),
    db
      .select({ name: vendorProfiles.businessName, location: vendorProfiles.location })
      .from(vendorProfiles)
      .where(eq(vendorProfiles.accreditationStatus, "trusted"))
      .orderBy(asc(vendorProfiles.businessName)),
  ]);
  const view = (date: string): XpDropView | null => {
    if (funded.has(date)) return null;
    const area = xpDropArea(date);
    const venues = partners.filter((p) => areaForLocation(p.location) === area).map((p) => p.name);
    // No partner there yet means nowhere to earn it, so don't show it.
    if (venues.length === 0) return null;
    return { date, area, xp: XP_DROP_XP, venues: venues.slice(0, 3) };
  };
  return { today: view(today), tomorrow: dates.length > 1 ? view(tomorrow) : null };
}
