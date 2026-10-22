import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  adminActionLog,
  bookings,
  challengeCompletions,
  events,
  listings,
  pointRedemptions,
  referralCredits,
  reviews,
  rewards,
  stamps,
  trailCompletions,
  trails,
  travellerInterests,
  travellerProfiles,
  userRewards,
  users,
  vendorProfiles,
} from "@/db/schema";
import type { DbOrTx } from "@/lib/db-context";
import { getPointsEarnedLast12Months, tierForPoints, twelveMonthsAgo, type Tier } from "@/lib/data/points";
import { BOOKING_COMPLETION_XP, TIER_THRESHOLDS } from "@/lib/rewards-config";
import { getChallengesWithStatus, getPassportProgress, getReferralStats } from "./traveller";
import { resolvePostContexts } from "./post-context";

// Points weighting — extends the existing stamps/challenges/reviews/referral
// mechanics into one balance rather than building a separate parallel
// currency. Tune freely; these are just starting values.
const POINTS = {
  perStamp: 100,
  perChallenge: 50,
  perReview: 30,
  perReferral: 150,
  profileComplete: 50,
} as const;

export async function getRewardsSummary(travellerId: string, persona: string | null, city: string | null) {
  const [
    { stampCount },
    challenges,
    myReviews,
    referralStats,
    interestRows,
    [{ spent }],
    completedBookings,
    trailXpRows,
  ] = await Promise.all([
    getPassportProgress(travellerId),
    getChallengesWithStatus(travellerId),
    db.select({ id: reviews.id }).from(reviews).where(eq(reviews.travellerId, travellerId)),
    getReferralStats(travellerId),
    db.select({ id: travellerInterests.id }).from(travellerInterests).where(eq(travellerInterests.travellerId, travellerId)),
    db
      .select({ spent: sql<number>`coalesce(sum(${pointRedemptions.pointsCost}), 0)::int` })
      .from(pointRedemptions)
      .where(eq(pointRedemptions.travellerId, travellerId)),
    db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(eq(bookings.travellerId, travellerId), eq(bookings.status, "completed"))),
    db
      .select({ bonusXp: trails.bonusXp })
      .from(trailCompletions)
      .innerJoin(trails, eq(trailCompletions.trailId, trails.id))
      .where(eq(trailCompletions.travellerId, travellerId)),
  ]);

  const completedChallenges = challenges.filter((c) => c.completion?.status === "verified").length;
  const profileComplete = Boolean(persona && city && interestRows.length > 0);
  const trailsXp = trailXpRows.reduce((sum, r) => sum + r.bonusXp, 0);

  const breakdown = [
    { label: "Passport stamps", count: stampCount, points: stampCount * POINTS.perStamp },
    { label: "Challenges completed", count: completedChallenges, points: completedChallenges * POINTS.perChallenge },
    { label: "Reviews written", count: myReviews.length, points: myReviews.length * POINTS.perReview },
    {
      // Counted from referralCredits with status="awarded" (see
      // getReferralStats) — a referral only pays out once the referee's
      // first booking is confirmed, not at signup.
      label: "Friends referred",
      count: referralStats.awardedCount,
      points: referralStats.awardedPoints,
    },
    { label: "Profile complete", count: profileComplete ? 1 : 0, points: profileComplete ? POINTS.profileComplete : 0 },
    {
      label: "Bookings completed",
      count: completedBookings.length,
      points: completedBookings.length * BOOKING_COMPLETION_XP,
    },
    { label: "Trails completed", count: trailXpRows.length, points: trailsXp },
  ];

  // "totalPoints"/"availablePoints" are this function's existing field
  // names — they're Passport XP, shown under that label in the UI (see
  // the two-ledger split in the Wano additions plan). Spendable, UGX-valued
  // points live in pointsLedger (src/lib/data/points.ts) and are entirely
  // separate — never summed with this total.
  const totalPoints = breakdown.reduce((sum, b) => sum + b.points, 0);

  return {
    totalPoints,
    availablePoints: totalPoints - spent,
    breakdown,
    referralCode: referralStats.referralCode,
    pendingReferrals: referralStats.pendingCount,
  };
}

function bookingCompletionDateFilter(since: Date) {
  // Mirrors the booking-completion cron's own due-date logic: a listing
  // booking's date proxy is coalesce(endDate, visitDate); an event
  // booking's is the event's own startAt.
  return sql`(
    (${bookings.listingId} is not null and coalesce(${bookings.endDate}, ${bookings.visitDate}) >= ${since.toISOString().slice(0, 10)})
    or (${bookings.eventId} is not null and exists (
      select 1 from events e where e.id = ${bookings.eventId} and e.start_at >= ${since.toISOString()}
    ))
  )`;
}

// XP earned in the trailing 12 months — the window getTierStatus uses for
// tiering (see judgment call 4 in the Wano additions plan). The one-off
// "profile complete" bonus has no event date, so it's excluded here
// (counted only in getRewardsSummary's lifetime total).
export async function getXpEarnedLast12Months(travellerId: string): Promise<number> {
  const since = twelveMonthsAgo();

  const [stampRows, completionRows, reviewRows, referralRows, completedBookingRows, trailRows] = await Promise.all([
    db
      .select({ id: stamps.id })
      .from(stamps)
      .where(and(eq(stamps.travellerId, travellerId), gte(stamps.earnedAt, since))),
    db
      .select({ id: challengeCompletions.id })
      .from(challengeCompletions)
      .where(
        and(
          eq(challengeCompletions.travellerId, travellerId),
          eq(challengeCompletions.status, "verified"),
          isNotNull(challengeCompletions.completedAt),
          gte(challengeCompletions.completedAt, since),
        ),
      ),
    db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.travellerId, travellerId), gte(reviews.createdAt, since))),
    db
      .select({ points: referralCredits.points })
      .from(referralCredits)
      .where(
        and(
          eq(referralCredits.referrerId, travellerId),
          eq(referralCredits.status, "awarded"),
          isNotNull(referralCredits.awardedAt),
          gte(referralCredits.awardedAt, since),
        ),
      ),
    db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(eq(bookings.travellerId, travellerId), eq(bookings.status, "completed"), bookingCompletionDateFilter(since)),
      ),
    db
      .select({ bonusXp: trails.bonusXp })
      .from(trailCompletions)
      .innerJoin(trails, eq(trailCompletions.trailId, trails.id))
      .where(and(eq(trailCompletions.travellerId, travellerId), gte(trailCompletions.completedAt, since))),
  ]);

  return (
    stampRows.length * POINTS.perStamp +
    completionRows.length * POINTS.perChallenge +
    reviewRows.length * POINTS.perReview +
    referralRows.reduce((sum, r) => sum + r.points, 0) +
    completedBookingRows.length * BOOKING_COMPLETION_XP +
    trailRows.reduce((sum, r) => sum + r.bonusXp, 0)
  );
}

export async function getTierStatus(travellerId: string) {
  const [xp, points] = await Promise.all([
    getXpEarnedLast12Months(travellerId),
    getPointsEarnedLast12Months(travellerId),
  ]);
  const earnedLast12Months = xp + points;
  const tier: Tier = tierForPoints(earnedLast12Months);

  const nextTier: Exclude<Tier, "explorer"> | null =
    tier === "explorer" ? "insider" : tier === "insider" ? "legend" : null;
  const nextThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : null;

  return {
    tier,
    earnedLast12Months,
    xpEarnedLast12Months: xp,
    pointsEarnedLast12Months: points,
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
