"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { rewardRedemptions, rewards } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { getRewardsSummary } from "@/lib/data/rewards";
import type { ActionState } from "@/lib/validation";

function revalidateRewardPaths() {
  revalidatePath("/passport");
  revalidatePath("/admin/rewards");
}

export async function redeemRewardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const rewardId = formData.get("rewardId");
  if (typeof rewardId !== "string" || !rewardId) return { error: "Missing reward." };

  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Traveller profile not found." };

  const [reward] = await db.select().from(rewards).where(eq(rewards.id, rewardId)).limit(1);
  if (!reward || !reward.active) return { error: "That reward is no longer available." };

  if (reward.stock !== null) {
    const redeemedRows = await db
      .select({ id: rewardRedemptions.id })
      .from(rewardRedemptions)
      .where(eq(rewardRedemptions.rewardId, reward.id));
    const redeemedCount = redeemedRows.length;
    if (redeemedCount >= reward.stock) return { error: "That reward is out of stock." };
  }

  const summary = await getRewardsSummary(travellerProfile.id, travellerProfile.persona, travellerProfile.city);
  if (summary.availablePoints < reward.pointsCost) {
    return { error: "You don't have enough points for that yet." };
  }

  await db.insert(rewardRedemptions).values({
    travellerId: travellerProfile.id,
    rewardId: reward.id,
    pointsSpent: reward.pointsCost,
  });

  revalidateRewardPaths();

  return {};
}

const rewardSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().min(2).max(500),
  pointsCost: z.coerce.number().int().min(1),
  stock: z.string().optional().or(z.literal("")),
});

export async function createRewardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");

  const parsed = rewardSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    pointsCost: formData.get("pointsCost"),
    stock: formData.get("stock") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the reward fields." };
  }

  const stock = parsed.data.stock ? Number.parseInt(parsed.data.stock, 10) : null;
  if (stock !== null && (!Number.isFinite(stock) || stock < 0)) {
    return { error: "Stock must be a positive number, or blank for unlimited." };
  }

  await db.insert(rewards).values({
    title: parsed.data.title,
    description: parsed.data.description,
    pointsCost: parsed.data.pointsCost,
    stock,
  });

  revalidateRewardPaths();

  return {};
}

export async function toggleRewardActiveAction(rewardId: string, active: boolean) {
  await requireRole("admin");

  await db.update(rewards).set({ active }).where(eq(rewards.id, rewardId));

  revalidateRewardPaths();
}

export async function setRedemptionStatusAction(
  redemptionId: string,
  status: "fulfilled" | "cancelled",
) {
  await requireRole("admin");

  await db.update(rewardRedemptions).set({ status }).where(eq(rewardRedemptions.id, redemptionId));

  revalidateRewardPaths();
}
