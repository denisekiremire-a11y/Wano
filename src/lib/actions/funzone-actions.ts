"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { funzoneClaims, rewards } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { generateShortCode } from "@/lib/codes";
import { mintUserReward } from "@/lib/actions/reward-actions";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function uniqueClaimCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateShortCode();
    const [existing] = await db
      .select({ id: funzoneClaims.id })
      .from(funzoneClaims)
      .where(eq(funzoneClaims.claimCode, code))
      .limit(1);
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique claim code.");
}

// Fun Zone win → a shareable claim link, not an SMS send: no SMS/WhatsApp
// gateway is integrated, so staff hand the phone's owner this link
// directly (AirDrop, show the screen, or paste into WhatsApp themselves).
// The acquisition-loop property that matters — an account is required
// before the voucher exists — still holds either way.
export async function issueFunzoneClaimAction(
  phone: string,
  rewardId: string,
): Promise<{ error: string } | { claimUrl: string; claimCode: string }> {
  const session = await requireRole("admin");

  if (!phone.trim()) return { error: "Enter the winner's phone number." };

  const [reward] = await db
    .select()
    .from(rewards)
    .where(and(eq(rewards.id, rewardId), eq(rewards.source, "funzone"), eq(rewards.active, true)))
    .limit(1);
  if (!reward) return { error: "Pick a prize from the Fun Zone pool." };

  const claimCode = await uniqueClaimCode();
  await db.insert(funzoneClaims).values({
    phone: phone.trim(),
    rewardId: reward.id,
    claimCode,
    issuedByUserId: session.userId,
  });

  revalidatePath("/admin/funzone");

  return { claimUrl: `${APP_URL}/claim/${claimCode}`, claimCode };
}

export async function getFunzoneClaimByCode(code: string) {
  const [row] = await db
    .select({ claim: funzoneClaims, reward: rewards })
    .from(funzoneClaims)
    .innerJoin(rewards, eq(funzoneClaims.rewardId, rewards.id))
    .where(eq(funzoneClaims.claimCode, code))
    .limit(1);
  return row ?? null;
}

/** Mints the voucher and marks the claim used — called once a traveller
 * session exists, either because they were already logged in when they
 * opened the link, or right after signup/login redirected them back here. */
export async function finalizeFunzoneClaim(claimCode: string, travellerId: string) {
  const row = await getFunzoneClaimByCode(claimCode);
  if (!row || row.claim.status !== "pending") return null;

  const userReward = await mintUserReward(travellerId, row.reward.id);

  await db
    .update(funzoneClaims)
    .set({ status: "claimed", travellerId, claimedAt: new Date() })
    .where(eq(funzoneClaims.id, row.claim.id));

  return userReward;
}
