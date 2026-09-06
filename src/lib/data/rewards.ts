import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { reviews, rewardRedemptions, rewards, travellerInterests, travellerProfiles } from "@/db/schema";
import { getChallengesWithStatus, getPassportProgress, getReferralStats } from "./traveller";

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
      label: "Friends referred",
      count: referralStats.referredCount,
      points: referralStats.referredCount * POINTS.perReferral,
    },
    { label: "Profile complete", count: profileComplete ? 1 : 0, points: profileComplete ? POINTS.profileComplete : 0 },
  ];

  const totalPoints = breakdown.reduce((sum, b) => sum + b.points, 0);
  const spentPoints = await getSpentPoints(travellerId);

  return {
    totalPoints,
    spentPoints,
    availablePoints: totalPoints - spentPoints,
    breakdown,
    referralCode: referralStats.referralCode,
  };
}

// Sum of points spent on redemptions that weren't cancelled — a cancelled
// redemption refunds the points by simply not counting toward this sum.
export async function getSpentPoints(travellerId: string) {
  const rows = await db
    .select({ pointsSpent: rewardRedemptions.pointsSpent })
    .from(rewardRedemptions)
    .where(and(eq(rewardRedemptions.travellerId, travellerId), ne(rewardRedemptions.status, "cancelled")));
  return rows.reduce((sum, r) => sum + r.pointsSpent, 0);
}

export async function getActiveRewards() {
  const catalog = await db.select().from(rewards).where(eq(rewards.active, true)).orderBy(rewards.pointsCost);

  const redeemedCounts = await db
    .select({ rewardId: rewardRedemptions.rewardId, count: sql<number>`count(*)::int` })
    .from(rewardRedemptions)
    .where(ne(rewardRedemptions.status, "cancelled"))
    .groupBy(rewardRedemptions.rewardId);
  const redeemedMap = new Map(redeemedCounts.map((r) => [r.rewardId, r.count]));

  return catalog.map((reward) => ({
    ...reward,
    remaining: reward.stock === null ? null : Math.max(0, reward.stock - (redeemedMap.get(reward.id) ?? 0)),
  }));
}

export async function getMyRedemptions(travellerId: string) {
  return db
    .select({ redemption: rewardRedemptions, reward: rewards })
    .from(rewardRedemptions)
    .innerJoin(rewards, eq(rewardRedemptions.rewardId, rewards.id))
    .where(eq(rewardRedemptions.travellerId, travellerId))
    .orderBy(desc(rewardRedemptions.createdAt));
}

export async function getAllRewardsForAdmin() {
  return db.select().from(rewards).orderBy(desc(rewards.createdAt));
}

export async function getRedemptionQueueForAdmin() {
  return db
    .select({ redemption: rewardRedemptions, reward: rewards, traveller: travellerProfiles })
    .from(rewardRedemptions)
    .innerJoin(rewards, eq(rewardRedemptions.rewardId, rewards.id))
    .innerJoin(travellerProfiles, eq(rewardRedemptions.travellerId, travellerProfiles.id))
    .orderBy(desc(rewardRedemptions.createdAt));
}
