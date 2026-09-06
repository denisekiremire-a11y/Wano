"use server";

import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { events, rewards, userRewards, vendorProfiles, vendorSubmissions } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { generateShortCode } from "@/lib/codes";
import { getOwningVendorProfileId, getUserRewardById } from "@/lib/data/rewards";
import { getPendingEditSubmission } from "@/lib/data/submissions";
import { getTravellerProfileById, getTravellerProfileByUserId } from "@/lib/data/traveller";
import { getVendorProfileByUserId } from "@/lib/data/vendor";
import { notifyAdmin } from "@/lib/notify";
import { notifyRewardClaimed, notifyRewardRedeemed } from "@/lib/reward-notifications";
import { signRewardToken, verifyRewardToken } from "@/lib/reward-token";
import type { ActionState } from "@/lib/validation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function revalidateRewardPaths() {
  revalidatePath("/passport");
  revalidatePath("/admin/rewards");
  revalidatePath("/vendor/dashboard/redeem");
}

async function uniqueRedemptionCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateShortCode();
    const [existing] = await db
      .select({ id: userRewards.id })
      .from(userRewards)
      .where(eq(userRewards.redemptionCode, code))
      .limit(1);
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique redemption code.");
}

/** A reward tied to an event expires when the event ends, not on the
 * catalog's default validity window — an "off at this hotel" voucher can
 * sit for weeks, but a match-day perk shouldn't outlive the match. */
async function resolveExpiryFor(reward: typeof rewards.$inferSelect) {
  if (reward.targetType === "event") {
    const [event] = await db.select().from(events).where(eq(events.id, reward.targetId)).limit(1);
    if (event) return event.endAt ?? event.startAt;
  }
  const expires = new Date();
  expires.setDate(expires.getDate() + reward.defaultValidityDays);
  return expires;
}

/** Mints a user_reward. Shared by every issuance path — self-claim,
 * Fun Zone, XP draws, referrals — so expiry/code generation stay
 * consistent no matter how the voucher was earned. */
export async function mintUserReward(travellerId: string, rewardId: string) {
  const [reward] = await db.select().from(rewards).where(eq(rewards.id, rewardId)).limit(1);
  if (!reward || !reward.active) throw new Error("That reward is no longer available.");

  const expiresAt = await resolveExpiryFor(reward);
  const redemptionCode = await uniqueRedemptionCode();

  const [created] = await db
    .insert(userRewards)
    .values({
      travellerId,
      rewardId: reward.id,
      targetType: reward.targetType,
      targetId: reward.targetId,
      redemptionCode,
      expiresAt,
    })
    .returning();

  await notifyRewardClaimed(created.id);

  return created;
}

export async function claimRewardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const rewardId = formData.get("rewardId");
  if (typeof rewardId !== "string" || !rewardId) return { error: "Missing reward." };

  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Traveller profile not found." };

  const [reward] = await db.select().from(rewards).where(eq(rewards.id, rewardId)).limit(1);
  if (!reward || !reward.active) return { error: "That reward is no longer available." };
  if (reward.source !== "campaign" && reward.source !== "manual") {
    return { error: "That reward can't be claimed directly." };
  }

  const [existing] = await db
    .select({ id: userRewards.id })
    .from(userRewards)
    .where(
      and(
        eq(userRewards.travellerId, travellerProfile.id),
        eq(userRewards.rewardId, reward.id),
        eq(userRewards.status, "claimed"),
      ),
    )
    .limit(1);
  if (existing) return { error: "You've already claimed this." };

  await mintUserReward(travellerProfile.id, reward.id);

  revalidateRewardPaths();
  revalidatePath(reward.targetType === "listing" ? `/explore/${reward.targetId}` : `/events/${reward.targetId}`);

  return {};
}

/** Generates a fresh 120s signed QR for a voucher the caller owns —
 * re-called by the client every ~90s while the voucher card is open so a
 * screenshot of the code goes stale almost immediately. */
export async function generateRewardQrAction(userRewardId: string) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) throw new Error("Traveller profile not found.");

  const row = await getUserRewardById(userRewardId);
  if (!row || row.userReward.travellerId !== travellerProfile.id) {
    throw new Error("Voucher not found.");
  }

  const token = await signRewardToken(userRewardId);
  const verifyUrl = `${APP_URL}/vendor/redeem/token/${token}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 240 });

  return { qrDataUrl, expiresInSeconds: 120 };
}

export type RedeemCheck =
  | { ok: true; travellerName: string; rewardTitle: string; discountType: string; discountValue: string | null }
  | { ok: false; reason: "invalid" | "already_redeemed" | "expired" | "wrong_venue" | "void"; detail?: string };

async function checkRedeemable(userRewardId: string, vendorProfileId: string): Promise<RedeemCheck> {
  const row = await getUserRewardById(userRewardId);
  if (!row) return { ok: false, reason: "invalid" };

  const owningVendorId = await getOwningVendorProfileId(row.userReward.targetType, row.userReward.targetId);
  if (owningVendorId !== vendorProfileId) return { ok: false, reason: "wrong_venue" };

  if (row.userReward.status === "redeemed") {
    return {
      ok: false,
      reason: "already_redeemed",
      detail: row.userReward.redeemedAt ? row.userReward.redeemedAt.toLocaleString() : undefined,
    };
  }
  if (row.userReward.status === "void") return { ok: false, reason: "void" };
  if (row.userReward.status === "expired" || row.userReward.expiresAt < new Date()) {
    return { ok: false, reason: "expired" };
  }

  const traveller = await getTravellerProfileById(row.userReward.travellerId);

  return {
    ok: true,
    travellerName: traveller?.displayName ?? "Traveller",
    rewardTitle: row.reward.title,
    discountType: row.reward.discountType,
    discountValue: row.reward.discountValue,
  };
}

/** Server-side check for the /vendor/redeem/token/[token] page — validates
 * signature + expiry (of the QR token itself, separate from the voucher's
 * own expiresAt) before ever looking at the voucher. */
export async function verifyRewardTokenForVendor(token: string): Promise<RedeemCheck & { userRewardId?: string }> {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return { ok: false, reason: "invalid" };

  const decoded = await verifyRewardToken(token);
  if (!decoded) return { ok: false, reason: "invalid" };

  const result = await checkRedeemable(decoded.userRewardId, vendorProfile.id);
  return { ...result, userRewardId: decoded.userRewardId };
}

export async function lookupRewardByCodeForVendor(code: string): Promise<RedeemCheck & { userRewardId?: string }> {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return { ok: false, reason: "invalid" };

  const [row] = await db
    .select({ id: userRewards.id })
    .from(userRewards)
    .where(eq(userRewards.redemptionCode, code.trim().toUpperCase()))
    .limit(1);
  if (!row) return { ok: false, reason: "invalid" };

  const result = await checkRedeemable(row.id, vendorProfile.id);
  return { ...result, userRewardId: row.id };
}

export async function markRewardRedeemedAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userRewardId = formData.get("userRewardId");
  const pin = formData.get("pin");
  if (typeof userRewardId !== "string" || !userRewardId) return { error: "Missing voucher." };
  if (typeof pin !== "string" || !pin) return { error: "Enter the venue PIN." };

  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return { error: "Vendor profile not found." };
  if (!vendorProfile.staffPinHash) return { error: "Set a venue PIN first, in Redeem settings." };

  const pinValid = await bcrypt.compare(pin, vendorProfile.staffPinHash);
  if (!pinValid) return { error: "Incorrect PIN." };

  const check = await checkRedeemable(userRewardId, vendorProfile.id);
  if (!check.ok) {
    const messages: Record<typeof check.reason, string> = {
      invalid: "Voucher not found.",
      already_redeemed: `Already redeemed${check.detail ? ` (${check.detail})` : ""}.`,
      expired: "This voucher has expired.",
      wrong_venue: "This voucher isn't for your venue.",
      void: "This voucher was voided.",
    };
    return { error: messages[check.reason] };
  }

  await db
    .update(userRewards)
    .set({ status: "redeemed", redeemedAt: new Date(), redeemedByVendorProfileId: vendorProfile.id })
    .where(eq(userRewards.id, userRewardId));

  await notifyRewardRedeemed(userRewardId);

  revalidateRewardPaths();

  return {};
}

const pinSchema = z.string().regex(/^\d{4,6}$/, "PIN must be 4 to 6 digits.");

export async function setVendorPinAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return { error: "Vendor profile not found." };

  const parsed = pinSchema.safeParse(formData.get("pin"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a 4-6 digit PIN." };

  const staffPinHash = await bcrypt.hash(parsed.data, 10);
  await db
    .update(vendorProfiles)
    .set({ staffPinHash, pinRotatedAt: new Date() })
    .where(eq(vendorProfiles.id, vendorProfile.id));

  revalidatePath("/vendor/dashboard/redeem");

  return {};
}

const rewardSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional().or(z.literal("")),
  target: z.string().min(1),
  discountType: z.enum(["percent", "fixed", "freebie"]),
  discountValue: z.string().optional().or(z.literal("")),
  source: z.enum(["manual", "funzone", "xp_draw"]),
  fundedBy: z.string().optional().or(z.literal("")),
  defaultValidityDays: z.coerce.number().int().min(1).max(365),
});

export async function createRewardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");

  const parsed = rewardSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    target: formData.get("target"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue") ?? "",
    source: formData.get("source") || "manual",
    fundedBy: formData.get("fundedBy") ?? "",
    defaultValidityDays: formData.get("defaultValidityDays") || "30",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the reward fields." };
  }

  // target is "listing:<uuid>" or "event:<uuid>" — same scope-picker pattern
  // as admin promotions.
  const [kind, id] = parsed.data.target.split(":");
  if ((kind !== "listing" && kind !== "event") || !id) {
    return { error: "Pick what this reward applies to." };
  }
  if (parsed.data.discountType !== "freebie" && !parsed.data.discountValue) {
    return { error: "Enter a discount value." };
  }

  await db.insert(rewards).values({
    title: parsed.data.title,
    description: parsed.data.description || null,
    targetType: kind,
    targetId: id,
    discountType: parsed.data.discountType,
    discountValue: parsed.data.discountType === "freebie" ? null : parsed.data.discountValue || null,
    source: parsed.data.source,
    fundedBy: parsed.data.fundedBy || null,
    defaultValidityDays: parsed.data.defaultValidityDays,
  });

  revalidateRewardPaths();

  return {};
}

// The vendor-facing subset of reward fields — no source/fundedBy, those are
// ops-level knobs (which flow issues it, who funds it commercially) that
// stay admin-only. Shared by the vendor's submit action and the admin
// approval flow that applies it, so both stay in sync.
export const vendorRewardContentSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional().or(z.literal("")),
  listingId: z.string().uuid(),
  discountType: z.enum(["percent", "fixed", "freebie"]),
  discountValue: z.string().optional().or(z.literal("")),
  defaultValidityDays: z.coerce.number().int().min(1).max(365),
});

export type VendorRewardContent = z.infer<typeof vendorRewardContentSchema>;

/** Creates or updates a reward from vendor-submitted (admin-approved)
 * content. Vendor rewards always source "manual" (self-claim) — Fun Zone
 * and XP-draw prizes stay an admin-only concept, picked from the catalog
 * separately, not something a vendor submission can set. */
export async function applyVendorRewardContent(rewardId: string | null, d: VendorRewardContent): Promise<string> {
  const values = {
    title: d.title,
    description: d.description || null,
    targetType: "listing" as const,
    targetId: d.listingId,
    discountType: d.discountType,
    discountValue: d.discountType === "freebie" ? null : d.discountValue || null,
    defaultValidityDays: d.defaultValidityDays,
  };

  if (rewardId) {
    await db.update(rewards).set(values).where(eq(rewards.id, rewardId));
    return rewardId;
  }
  const [created] = await db.insert(rewards).values({ ...values, source: "manual" }).returning();
  return created.id;
}

function parseVendorRewardFromFormData(formData: FormData) {
  return vendorRewardContentSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    listingId: formData.get("listingId"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue") ?? "",
    defaultValidityDays: formData.get("defaultValidityDays") || "30",
  });
}

/** Creates a new reward proposal, or an edit to one of the vendor's own
 * existing rewards, as a pending vendorSubmission for admin review — same
 * shadow-draft pattern as vendor listing submissions. */
export async function submitRewardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return { error: "Vendor profile not found." };

  const parsed = parseVendorRewardFromFormData(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the reward fields." };
  if (parsed.data.discountType !== "freebie" && !parsed.data.discountValue) {
    return { error: "Enter a discount value." };
  }

  const owner = await getOwningVendorProfileId("listing", parsed.data.listingId);
  if (owner !== vendorProfile.id) return { error: "You can only create rewards for your own listings." };

  const rewardId = String(formData.get("rewardId") ?? "") || null;
  if (rewardId) {
    const [existingReward] = await db.select().from(rewards).where(eq(rewards.id, rewardId)).limit(1);
    if (!existingReward) return { error: "Reward not found." };
    const existingOwner = await getOwningVendorProfileId(existingReward.targetType, existingReward.targetId);
    if (existingOwner !== vendorProfile.id) return { error: "You can only edit your own rewards." };
  }

  const payload = parsed.data as unknown as Record<string, unknown>;
  if (rewardId) {
    const existing = await getPendingEditSubmission(vendorProfile.id, "reward", rewardId);
    if (existing) {
      await db
        .update(vendorSubmissions)
        .set({ payload, status: "pending", reviewNotes: null, updatedAt: new Date() })
        .where(eq(vendorSubmissions.id, existing.id));
    } else {
      await db
        .insert(vendorSubmissions)
        .values({ vendorProfileId: vendorProfile.id, entityType: "reward", entityId: rewardId, payload });
    }
  } else {
    await db
      .insert(vendorSubmissions)
      .values({ vendorProfileId: vendorProfile.id, entityType: "reward", entityId: null, payload });
  }

  await notifyAdmin("New vendor reward submission", [
    `<strong>${vendorProfile.businessName}</strong> submitted ${rewardId ? "an edit to" : "a new reward:"} "${parsed.data.title}" for review.`,
  ]);

  revalidatePath("/vendor/dashboard/rewards");
  revalidatePath("/admin/submissions");
  return {};
}

export async function withdrawRewardSubmissionAction(submissionId: string) {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) throw new Error("Vendor profile not found.");

  const [row] = await db.select().from(vendorSubmissions).where(eq(vendorSubmissions.id, submissionId)).limit(1);
  if (!row || row.vendorProfileId !== vendorProfile.id || row.status !== "pending") {
    throw new Error("Submission not found.");
  }
  await db.delete(vendorSubmissions).where(eq(vendorSubmissions.id, submissionId));
  revalidatePath("/vendor/dashboard/rewards");
}

export async function toggleRewardActiveAction(rewardId: string, active: boolean) {
  await requireRole("admin");

  await db.update(rewards).set({ active }).where(eq(rewards.id, rewardId));

  revalidateRewardPaths();
}
