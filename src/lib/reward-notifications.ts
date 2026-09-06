import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rewards, travellerProfiles, userRewards, users } from "@/db/schema";
import { notifyAdmin, notifyUser } from "@/lib/notify";
import { formatRewardDiscount } from "@/lib/reward-format";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function getUserRewardNotificationRow(userRewardId: string) {
  const [row] = await db
    .select({
      userReward: userRewards,
      reward: rewards,
      travellerName: travellerProfiles.displayName,
      travellerEmail: users.email,
    })
    .from(userRewards)
    .innerJoin(rewards, eq(userRewards.rewardId, rewards.id))
    .innerJoin(travellerProfiles, eq(userRewards.travellerId, travellerProfiles.id))
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(eq(userRewards.id, userRewardId))
    .limit(1);
  return row ?? null;
}

export async function notifyRewardClaimed(userRewardId: string) {
  const row = await getUserRewardNotificationRow(userRewardId);
  if (!row) return;
  const discount = formatRewardDiscount(row.reward.discountType, row.reward.discountValue);

  await notifyUser(row.travellerEmail, "Reward claimed", [
    `You claimed <strong>${row.reward.title}</strong> — ${discount}.`,
    `It's in your Passport wallet, valid until ${row.userReward.expiresAt.toLocaleDateString()}.`,
    `<a href="${APP_URL}/passport?tab=rewards">View your rewards</a>.`,
  ]);

  await notifyAdmin("Reward claimed", [
    `<strong>${row.travellerName}</strong> claimed <strong>${row.reward.title}</strong> (${discount}).`,
  ]);
}

export async function notifyRewardRedeemed(userRewardId: string) {
  const row = await getUserRewardNotificationRow(userRewardId);
  if (!row) return;
  const discount = formatRewardDiscount(row.reward.discountType, row.reward.discountValue);

  await notifyUser(row.travellerEmail, "Reward redeemed", [
    `<strong>${row.reward.title}</strong> (${discount}) was just redeemed at the venue.`,
    `<a href="${APP_URL}/passport?tab=rewards">View your rewards</a>.`,
  ]);

  await notifyAdmin("Reward redeemed", [
    `<strong>${row.travellerName}</strong>'s <strong>${row.reward.title}</strong> (${discount}) was redeemed.`,
  ]);
}
