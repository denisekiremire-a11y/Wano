import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reviews, travellerInterests } from "@/db/schema";
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

  return { totalPoints, breakdown, referralCode: referralStats.referralCode };
}
