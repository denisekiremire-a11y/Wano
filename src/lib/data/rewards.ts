import { and, asc, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  adminActionLog,
  events,
  listings,
  pointsLedger,
  rewards,
  travellerProfiles,
  userRewards,
  users,
  vendorProfiles,
} from "@/db/schema";
import type { DbOrTx } from "@/lib/db-context";
import { getPointsBalance, getPointsEarnedLast12Months, tierForPoints, type Tier } from "@/lib/data/points";
import { TIER_THRESHOLDS } from "@/lib/rewards-config";
import { getReferralStats } from "./traveller";
import { resolvePostContexts } from "./post-context";

// Every sourceType that can carry a positive delta into pointsLedger, in
// the fixed display order the Rewards page's breakdown has always shown —
// see each award call site (awardPoints/maybeAwardProfileCompleteBonus) for
// where each one is actually written.
const BREAKDOWN_SOURCES: { sourceType: string; label: string }[] = [
  { sourceType: "stamp", label: "Passport stamps" },
  { sourceType: "challenge", label: "Challenges completed" },
  { sourceType: "review", label: "Reviews written" },
  { sourceType: "referral_credit", label: "Friends referred" },
  { sourceType: "welcome_bonus", label: "Welcome bonus" },
  { sourceType: "profile_complete", label: "Profile complete" },
  { sourceType: "booking_completion_xp", label: "Bookings completed" },
  { sourceType: "trail_completion", label: "Trails completed" },
  { sourceType: "drop_redemption", label: "Daily Drops used" },
  { sourceType: "xp_drop", label: "XP Drops" },
  { sourceType: "weekly_challenge", label: "Weekly challenges" },
  { sourceType: "area_stamp", label: "Neighbourhood stamps" },
  { sourceType: "friend_first_visit", label: "Invited friends out" },
  { sourceType: "streak_milestone", label: "Streak milestones" },
  { sourceType: "group_outing", label: "Group outings with friends" },
  { sourceType: "reward_redemption", label: "Reward points granted" },
  { sourceType: "booking", label: "Booking points earned" },
];

export async function getRewardsSummary(travellerId: string) {
  const [earnedBySource, balance, referralStats] = await Promise.all([
    db
      .select({
        sourceType: pointsLedger.sourceType,
        count: sql<number>`count(*)::int`,
        points: sql<number>`sum(${pointsLedger.delta})::int`,
      })
      .from(pointsLedger)
      .where(and(eq(pointsLedger.travellerId, travellerId), sql`${pointsLedger.delta} > 0`))
      .groupBy(pointsLedger.sourceType),
    getPointsBalance(travellerId),
    getReferralStats(travellerId),
  ]);

  const earnedMap = new Map(earnedBySource.map((r) => [r.sourceType, { count: r.count, points: r.points }]));
  const breakdown = BREAKDOWN_SOURCES.map(({ sourceType, label }) => ({
    label,
    count: earnedMap.get(sourceType)?.count ?? 0,
    points: earnedMap.get(sourceType)?.points ?? 0,
  }));
  const totalPoints = breakdown.reduce((sum, b) => sum + b.points, 0);

  return {
    totalPoints,
    availablePoints: balance,
    breakdown,
    referralCode: referralStats.referralCode,
    pendingReferrals: referralStats.pendingCount,
  };
}

// Every XP-earning (or -spending) action now lives in one ledger — see
// awardPoints in src/lib/data/points.ts, which getPointsEarnedLast12Months
// already sums (positive deltas only, trailing 12 months). Kept under this
// name since src/lib/data/crews.ts imports it for a crew's combined total.
export { getPointsEarnedLast12Months as getXpEarnedLast12Months } from "@/lib/data/points";

export async function getTierStatus(travellerId: string) {
  const earnedLast12Months = await getPointsEarnedLast12Months(travellerId);
  const tier: Tier = tierForPoints(earnedLast12Months);

  const nextTier: Exclude<Tier, "explorer"> | null =
    tier === "explorer" ? "insider" : tier === "insider" ? "legend" : null;
  const nextThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : null;

  return {
    tier,
    earnedLast12Months,
    // Both now the same unified figure — kept as two fields so
    // src/app/admin/rewards/points/page.tsx (which shows them as separate
    // "XP (12mo)"/"Points (12mo)" stats) doesn't need changing in this
    // backend-only change; collapsing the display to one stat is PR2's job.
    xpEarnedLast12Months: earnedLast12Months,
    pointsEarnedLast12Months: earnedLast12Months,
    nextTier,
    nextThreshold,
    progressToNextTier: nextThreshold ? Math.min(1, earnedLast12Months / nextThreshold) : 1,
    remainingToNextTier: nextThreshold ? Math.max(0, nextThreshold - earnedLast12Months) : 0,
  };
}

export type RewardTarget = { targetType: "listing" | "event"; targetId: string };

async function resolveTargets(refs: RewardTarget[]) {
  return resolvePostContexts(refs.map((r) => ({ type: r.targetType, id: r.targetId })));
}

function targetKey(targetType: string, targetId: string) {
  return `${targetType}:${targetId}`;
}

// Self-claimable rewards visible on a target's page — only "campaign" and
// "manual" sourced rewards are claimable this way; funzone/xp_draw/referral
// vouchers are only ever minted through their own issuance flows.
export async function getClaimableRewardsForTarget(targetType: "listing" | "event", targetId: string, client: DbOrTx = db) {
  return client
    .select()
    .from(rewards)
    .where(
      and(
        eq(rewards.targetType, targetType),
        eq(rewards.targetId, targetId),
        eq(rewards.active, true),
        inArray(rewards.source, ["campaign", "manual"]),
      ),
    );
}

// This user's active (claimed) vouchers for one target — what a listing or
// event page shows under "Rewards". Redeemed/expired ones don't show here;
// the Passport wallet is where full history lives.
export async function getMyClaimedRewardsForTarget(
  travellerId: string,
  targetType: "listing" | "event",
  targetId: string,
  client: DbOrTx = db,
) {
  const rows = await client
    .select({ userReward: userRewards, reward: rewards })
    .from(userRewards)
    .innerJoin(rewards, eq(userRewards.rewardId, rewards.id))
    .where(
      and(
        eq(userRewards.travellerId, travellerId),
        eq(userRewards.targetType, targetType),
        eq(userRewards.targetId, targetId),
        eq(userRewards.status, "claimed"),
      ),
    )
    .orderBy(desc(userRewards.claimedAt));
  return rows;
}

// A traveller's full voucher wallet, across every target, grouped by
// status and sorted soonest-expiry-first within each group.
export async function getMyWallet(travellerId: string, client: DbOrTx = db) {
  const rows = await client
    .select({ userReward: userRewards, reward: rewards })
    .from(userRewards)
    .innerJoin(rewards, eq(userRewards.rewardId, rewards.id))
    .where(eq(userRewards.travellerId, travellerId))
    .orderBy(asc(userRewards.expiresAt));

  const targetMap = await resolveTargets(rows.map((r) => r.userReward));

  const withTarget = rows.map((r) => ({
    ...r,
    target: targetMap.get(targetKey(r.userReward.targetType, r.userReward.targetId)) ?? null,
  }));

  return {
    active: withTarget.filter((r) => r.userReward.status === "claimed"),
    used: withTarget.filter((r) => r.userReward.status === "redeemed"),
    expired: withTarget.filter((r) => r.userReward.status === "expired" || r.userReward.status === "void"),
  };
}

export async function getUserRewardById(userRewardId: string, client: DbOrTx = db) {
  const [row] = await client
    .select({ userReward: userRewards, reward: rewards })
    .from(userRewards)
    .innerJoin(rewards, eq(userRewards.rewardId, rewards.id))
    .where(eq(userRewards.id, userRewardId))
    .limit(1);
  return row ?? null;
}

// The vendorProfile that owns a reward's target, if any — the "wrong venue"
// check for redemption (see markRewardRedeemedAction).
export async function getOwningVendorProfileId(targetType: "listing" | "event", targetId: string) {
  if (targetType === "listing") {
    const [row] = await db
      .select({ vendorProfileId: listings.vendorProfileId })
      .from(listings)
      .where(eq(listings.id, targetId))
      .limit(1);
    return row?.vendorProfileId ?? null;
  }
  const [row] = await db
    .select({ vendorProfileId: events.organizerVendorProfileId })
    .from(events)
    .where(eq(events.id, targetId))
    .limit(1);
  return row?.vendorProfileId ?? null;
}

/** Every reward targeting one of this vendor's own listings — rewards have
 * no direct vendorProfileId column (targetType/targetId is polymorphic,
 * listing or event), so ownership is resolved via the vendor's listing
 * ids. Vendor-created rewards only ever target their own listings today. */
export async function getVendorRewards(vendorProfileId: string, client: DbOrTx = db) {
  const vendorListings = await db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.vendorProfileId, vendorProfileId));
  const listingIds = vendorListings.map((l) => l.id);
  if (listingIds.length === 0) return [];

  return client
    .select()
    .from(rewards)
    .where(and(eq(rewards.targetType, "listing"), inArray(rewards.targetId, listingIds)))
    .orderBy(desc(rewards.createdAt));
}

// The Fun Zone / XP-draw prize pools — active, staff- or admin-issuable
// rewards for those flows' pickers. Each is still tied to one place/event
// (a 50%-off row at one restaurant, a 20%-off row at another) rather than
// one universal prize, so the operator picks which specific prize a
// winner gets.
export async function getActiveRewardsBySource(source: "funzone" | "xp_draw", client: DbOrTx = db) {
  const catalog = await client
    .select()
    .from(rewards)
    .where(and(eq(rewards.active, true), eq(rewards.source, source)));
  const targetMap = await resolveTargets(catalog);
  return catalog.map((reward) => ({
    ...reward,
    target: targetMap.get(targetKey(reward.targetType, reward.targetId)) ?? null,
  }));
}

// The points-shop catalog — every active reward a traveller can spend
// points on, cheapest first, with its target resolved for display.
export async function getPointsShopCatalog(client: DbOrTx = db) {
  const catalog = await client
    .select()
    .from(rewards)
    .where(and(eq(rewards.active, true), eq(rewards.source, "points_shop")))
    .orderBy(asc(rewards.pointsCost));
  const targetMap = await resolveTargets(catalog);
  return catalog.map((reward) => ({
    ...reward,
    target: targetMap.get(targetKey(reward.targetType, reward.targetId)) ?? null,
  }));
}

export async function getRewardForAdmin(rewardId: string, client: DbOrTx = db) {
  const [reward] = await client.select().from(rewards).where(eq(rewards.id, rewardId)).limit(1);
  if (!reward) return null;
  const targetMap = await resolveTargets([reward]);
  return { ...reward, target: targetMap.get(targetKey(reward.targetType, reward.targetId)) ?? null };
}

export async function getAllRewardsForAdmin(client: DbOrTx = db) {
  const catalog = await client.select().from(rewards).orderBy(desc(rewards.createdAt));
  const targetMap = await resolveTargets(catalog);
  return catalog.map((reward) => ({
    ...reward,
    target: targetMap.get(targetKey(reward.targetType, reward.targetId)) ?? null,
  }));
}

export async function getVendorRedemptionsToday(vendorProfileId: string, client: DbOrTx = db) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const rows = await client
    .select({ userReward: userRewards, reward: rewards })
    .from(userRewards)
    .innerJoin(rewards, eq(userRewards.rewardId, rewards.id))
    .where(eq(userRewards.redeemedByVendorProfileId, vendorProfileId))
    .orderBy(desc(userRewards.redeemedAt));

  return rows.filter((r) => r.userReward.redeemedAt && r.userReward.redeemedAt >= startOfDay);
}

// Active reward campaigns targeting this vendor's own listing or events —
// what "active campaigns for that venue" means on the vendor dashboard.
export async function getVendorActiveCampaigns(vendorProfileId: string, client: DbOrTx = db) {
  const [ownListing] = await db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.vendorProfileId, vendorProfileId))
    .limit(1);
  const ownEvents = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.organizerVendorProfileId, vendorProfileId));

  const eventIds = ownEvents.map((e) => e.id);
  const targets: RewardTarget[] = [
    ...(ownListing ? [{ targetType: "listing" as const, targetId: ownListing.id }] : []),
    ...eventIds.map((id) => ({ targetType: "event" as const, targetId: id })),
  ];
  if (targets.length === 0) return [];

  const all = await client.select().from(rewards).where(eq(rewards.active, true));
  return all.filter((r) => targets.some((t) => t.targetType === r.targetType && t.targetId === r.targetId));
}

// This traveller's claimed vouchers redeemable at one specific vendor —
// what the vendor dashboard's "scan a visitor" flow shows after scanning
// their personal QR. Same own-listings/own-events resolution approach as
// getVendorActiveCampaigns, but against every listing (not just one) —
// see getVendorRewards for the same multi-listing pattern.
export async function getClaimableRewardsAtVendorForTraveller(
  travellerId: string,
  vendorProfileId: string,
  client: DbOrTx = db,
) {
  const [ownListings, ownEvents] = await Promise.all([
    db.select({ id: listings.id }).from(listings).where(eq(listings.vendorProfileId, vendorProfileId)),
    db.select({ id: events.id }).from(events).where(eq(events.organizerVendorProfileId, vendorProfileId)),
  ]);
  const listingIds = ownListings.map((l) => l.id);
  const eventIds = ownEvents.map((e) => e.id);
  if (listingIds.length === 0 && eventIds.length === 0) return [];

  const rows = await client
    .select({ userReward: userRewards, reward: rewards })
    .from(userRewards)
    .innerJoin(rewards, eq(userRewards.rewardId, rewards.id))
    .where(and(eq(userRewards.travellerId, travellerId), eq(userRewards.status, "claimed")))
    .orderBy(desc(userRewards.claimedAt));

  return rows.filter(
    ({ userReward }) =>
      (userReward.targetType === "listing" && listingIds.includes(userReward.targetId)) ||
      (userReward.targetType === "event" && eventIds.includes(userReward.targetId)),
  );
}

// Admin voucher search — by code, traveller (name/email), venue, and/or
// status. venueId filters after the fact since a voucher's venue is only
// resolvable via its polymorphic target (see getOwningVendorProfileId),
// not a direct column — fine at this scale (an admin tool, not a
// traveller-facing search).
export async function searchVouchersForAdmin(filters: {
  code?: string;
  travellerQuery?: string;
  vendorProfileId?: string;
  status?: (typeof userRewards.status.enumValues)[number];
}) {
  const conditions = [];
  if (filters.code?.trim()) conditions.push(ilike(userRewards.redemptionCode, `%${filters.code.trim()}%`));
  if (filters.status) conditions.push(eq(userRewards.status, filters.status));

  const rows = await db
    .select({ userReward: userRewards, reward: rewards, traveller: travellerProfiles, user: users })
    .from(userRewards)
    .innerJoin(rewards, eq(userRewards.rewardId, rewards.id))
    .innerJoin(travellerProfiles, eq(userRewards.travellerId, travellerProfiles.id))
    .innerJoin(users, eq(travellerProfiles.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(userRewards.claimedAt))
    .limit(200);

  const q = filters.travellerQuery?.trim().toLowerCase();
  const textFiltered = q
    ? rows.filter((r) => r.user.name.toLowerCase().includes(q) || r.user.email.toLowerCase().includes(q))
    : rows;

  if (!filters.vendorProfileId) {
    return textFiltered.map((r) => ({ ...r, vendorProfileId: null as string | null }));
  }
  const withVendor = await Promise.all(
    textFiltered.map(async (r) => ({
      ...r,
      vendorProfileId: await getOwningVendorProfileId(r.userReward.targetType, r.userReward.targetId),
    })),
  );
  return withVendor.filter((r) => r.vendorProfileId === filters.vendorProfileId);
}

export async function getVoucherDetailForAdmin(userRewardId: string) {
  const row = await getUserRewardById(userRewardId);
  if (!row) return null;
  const traveller = await db
    .select({ traveller: travellerProfiles, user: users })
    .from(travellerProfiles)
    .innerJoin(users, eq(travellerProfiles.userId, users.id))
    .where(eq(travellerProfiles.id, row.userReward.travellerId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
  const actionLog = await db
    .select()
    .from(adminActionLog)
    .where(and(eq(adminActionLog.targetType, "user_reward"), eq(adminActionLog.targetId, userRewardId)))
    .orderBy(desc(adminActionLog.createdAt));
  return { ...row, traveller, actionLog };
}

export async function getVendorProfileForListing(listingId: string) {
  const [row] = await db
    .select({ vendor: vendorProfiles })
    .from(listings)
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, listings.vendorProfileId))
    .where(eq(listings.id, listingId))
    .limit(1);
  return row?.vendor ?? null;
}
