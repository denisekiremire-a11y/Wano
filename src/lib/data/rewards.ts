import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events, listings, reviews, rewards, travellerInterests, userRewards, vendorProfiles } from "@/db/schema";
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
  const [{ stampCount }, challenges, myReviews, referralStats, interestRows] = await Promise.all([
    getPassportProgress(travellerId),
    getChallengesWithStatus(travellerId),
    db.select({ id: reviews.id }).from(reviews).where(eq(reviews.travellerId, travellerId)),
    getReferralStats(travellerId),
    db.select({ id: travellerInterests.id }).from(travellerInterests).where(eq(travellerInterests.travellerId, travellerId)),
  ]);

  const completedChallenges = challenges.filter((c) => c.completion?.status === "verified").length;
  const profileComplete = Boolean(persona && city && interestRows.length > 0);

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
  ];

  const totalPoints = breakdown.reduce((sum, b) => sum + b.points, 0);

  return {
    totalPoints,
    breakdown,
    referralCode: referralStats.referralCode,
    pendingReferrals: referralStats.pendingCount,
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
export async function getClaimableRewardsForTarget(targetType: "listing" | "event", targetId: string) {
  return db
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
) {
  const rows = await db
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
export async function getMyWallet(travellerId: string) {
  const rows = await db
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

export async function getUserRewardById(userRewardId: string) {
  const [row] = await db
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
export async function getVendorRewards(vendorProfileId: string) {
  const vendorListings = await db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.vendorProfileId, vendorProfileId));
  const listingIds = vendorListings.map((l) => l.id);
  if (listingIds.length === 0) return [];

  return db
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
export async function getActiveRewardsBySource(source: "funzone" | "xp_draw") {
  const catalog = await db
    .select()
    .from(rewards)
    .where(and(eq(rewards.active, true), eq(rewards.source, source)));
  const targetMap = await resolveTargets(catalog);
  return catalog.map((reward) => ({
    ...reward,
    target: targetMap.get(targetKey(reward.targetType, reward.targetId)) ?? null,
  }));
}

export async function getAllRewardsForAdmin() {
  const catalog = await db.select().from(rewards).orderBy(desc(rewards.createdAt));
  const targetMap = await resolveTargets(catalog);
  return catalog.map((reward) => ({
    ...reward,
    target: targetMap.get(targetKey(reward.targetType, reward.targetId)) ?? null,
  }));
}

export async function getVendorRedemptionsToday(vendorProfileId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const rows = await db
    .select({ userReward: userRewards, reward: rewards })
    .from(userRewards)
    .innerJoin(rewards, eq(userRewards.rewardId, rewards.id))
    .where(eq(userRewards.redeemedByVendorProfileId, vendorProfileId))
    .orderBy(desc(userRewards.redeemedAt));

  return rows.filter((r) => r.userReward.redeemedAt && r.userReward.redeemedAt >= startOfDay);
}

// Active reward campaigns targeting this vendor's own listing or events —
// what "active campaigns for that venue" means on the vendor dashboard.
export async function getVendorActiveCampaigns(vendorProfileId: string) {
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

  const all = await db.select().from(rewards).where(eq(rewards.active, true));
  return all.filter((r) => targets.some((t) => t.targetType === r.targetType && t.targetId === r.targetId));
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
