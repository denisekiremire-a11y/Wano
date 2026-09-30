"use server";

import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { events, pointRedemptions, pointsLedger, rewards, userRewards, vendorProfiles, vendorSubmissions } from "@/db/schema";
import { requireAdminLevel, requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/admin-action-log";
import { generateVoucherCode } from "@/lib/codes";
import type { DbOrTx } from "@/lib/db-context";
import { withRlsContext } from "@/lib/db-context";
import { enforceBudgetCapIfNeeded } from "@/lib/data/budget";
import { getOwningVendorProfileId, getRewardsSummary, getUserRewardById } from "@/lib/data/rewards";
import { vendorRewardContentSchema } from "@/lib/actions/reward-shared";
import { getPendingEditSubmission } from "@/lib/data/submissions";
import { getTravellerProfileById, getTravellerProfileByUserId } from "@/lib/data/traveller";
import { getVendorProfileByUserId } from "@/lib/data/vendor";
import { notifyAdmin } from "@/lib/notify";
import { notifyRewardClaimed, notifyRewardRedeemed } from "@/lib/reward-notifications";
import { signRewardToken, verifyRewardToken } from "@/lib/reward-token";
import type { ActionState } from "@/lib/validation";

// UGX has no subdivision, but every "minor unit" integer in this codebase
// (priceMinor, totalMinor, ...) is still just the plain UGX amount — same
// convention here, so a percent/spend_perk calculation is round(bill * pct
// / 100) with no further scaling.
function roundMinor(value: number) {
  return Math.round(value);
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function revalidateRewardPaths() {
  revalidatePath("/passport");
  revalidatePath("/admin/rewards");
  revalidatePath("/vendor/dashboard/redeem");
}

async function uniqueRedemptionCode(client: DbOrTx) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateVoucherCode();
    const [existing] = await client
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

/** True once a reward's window has opened and not yet closed — separate
 * from status (draft/active/paused/expired), which is the operator's own
 * on/off switch. Both must hold for a reward to be issuable. */
function withinRewardWindow(reward: Pick<typeof rewards.$inferSelect, "startsAt" | "endsAt">, now = new Date()) {
  if (reward.startsAt && now < reward.startsAt) return false;
  if (reward.endsAt && now > reward.endsAt) return false;
  return true;
}

/** Mints a user_reward. Shared by every issuance path — self-claim,
 * Fun Zone, XP draws, referrals — so expiry/code generation, and now
 * status/window/cap enforcement, stay consistent no matter how the
 * voucher was earned. Caps are checked here only (at mint time) — once a
 * voucher exists, redeeming it never fails because a cap filled up after
 * the fact (see checkRedeemable). */
export async function mintUserReward(travellerId: string, rewardId: string) {
  // Trusted-system write: every caller (self-claim, points-shop spend,
  // Fun Zone/XP-draw/referral issuance) has already decided this traveller
  // is entitled to this reward — same reasoning as Round A's engine-level
  // writes, this is just how that already-checked write clears RLS.
  const created = await withRlsContext({ role: "admin" }, async (tx) => {
    const [reward] = await tx.select().from(rewards).where(eq(rewards.id, rewardId)).limit(1);
    if (!reward || !reward.active || reward.status !== "active") {
      throw new Error("That reward is no longer available.");
    }
    if (!withinRewardWindow(reward)) throw new Error("That reward is no longer available.");

    if (reward.totalCap != null) {
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(userRewards)
        .where(eq(userRewards.rewardId, reward.id));
      if (count >= reward.totalCap) throw new Error("That reward has run out.");
    }

    const [{ ownCount }] = await tx
      .select({ ownCount: sql<number>`count(*)::int` })
      .from(userRewards)
      .where(and(eq(userRewards.rewardId, reward.id), eq(userRewards.travellerId, travellerId)));
    if (ownCount >= reward.perUserCap) throw new Error("You've already claimed the maximum for this reward.");

    const expiresAt = await resolveExpiryFor(reward);
    const redemptionCode = await uniqueRedemptionCode(tx);

    const [row] = await tx
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
    return row;
  });

  await notifyRewardClaimed(created.id);

  return created;
}

/** Spends points on a points-shop reward the traveller picked. Points
 * are never a stored balance (see getRewardsSummary) — "available"
 * is totalPoints (live) minus every past pointRedemptions row (also
 * live) — so the transaction re-sums spend under a per-traveller
 * advisory lock before inserting, the same pattern createXpBookingAction
 * uses for its per-match seat cap, so two rapid clicks can't both
 * spend the same points. No duplicate-purchase guard: unlike a
 * one-time campaign claim, a points-shop reward is meant to be
 * redeemable again once enough new points have been earned. */
export async function redeemPointsRewardAction(rewardId: string): Promise<ActionState> {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Traveller profile not found." };

  const reward = await withRlsContext(
    { userId: session.userId, role: "traveller", travellerProfileId: travellerProfile.id },
    (tx) => tx.select().from(rewards).where(eq(rewards.id, rewardId)).limit(1).then((rows) => rows[0]),
  );
  if (!reward || !reward.active || reward.source !== "points_shop" || !reward.pointsCost) {
    return { error: "That reward isn't available to redeem." };
  }

  const { totalPoints } = await getRewardsSummary(travellerProfile.id, travellerProfile.persona, travellerProfile.city);

  const redemption = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${travellerProfile.id}))`);

    const [{ spent }] = await tx
      .select({ spent: sql<number>`coalesce(sum(${pointRedemptions.pointsCost}), 0)::int` })
      .from(pointRedemptions)
      .where(eq(pointRedemptions.travellerId, travellerProfile.id));

    if (totalPoints - spent < reward.pointsCost!) return null;

    const [created] = await tx
      .insert(pointRedemptions)
      .values({ travellerId: travellerProfile.id, rewardId: reward.id, pointsCost: reward.pointsCost! })
      .returning();
    return created;
  });

  if (!redemption) return { error: "You don't have enough points for this yet." };

  const userReward = await mintUserReward(travellerProfile.id, reward.id);
  await db.update(pointRedemptions).set({ userRewardId: userReward.id }).where(eq(pointRedemptions.id, redemption.id));

  revalidateRewardPaths();
  revalidatePath(reward.targetType === "listing" ? `/explore/${reward.targetId}` : `/events/${reward.targetId}`);

  return {};
}

export async function claimRewardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const rewardId = formData.get("rewardId");
  if (typeof rewardId !== "string" || !rewardId) return { error: "Missing reward." };

  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Traveller profile not found." };

  type RewardRow = typeof rewards.$inferSelect;
  const { reward, existing } = await withRlsContext(
    { userId: session.userId, role: "traveller", travellerProfileId: travellerProfile.id },
    async (tx): Promise<{ reward: RewardRow | null; existing: boolean }> => {
      const [reward] = await tx.select().from(rewards).where(eq(rewards.id, rewardId)).limit(1);
      if (!reward) return { reward: null, existing: false };
      const [existing] = await tx
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
      return { reward, existing: Boolean(existing) };
    },
  );
  if (!reward || !reward.active) return { error: "That reward is no longer available." };
  if (reward.source !== "campaign" && reward.source !== "manual") {
    return { error: "That reward can't be claimed directly." };
  }
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

  const row = await withRlsContext(
    { userId: session.userId, role: "traveller", travellerProfileId: travellerProfile.id },
    (tx) => getUserRewardById(userRewardId, tx),
  );
  if (!row || row.userReward.travellerId !== travellerProfile.id) {
    throw new Error("Voucher not found.");
  }

  const token = await signRewardToken(userRewardId);
  const verifyUrl = `${APP_URL}/vendor/dashboard/redeem/token/${token}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 240 });

  return { qrDataUrl, expiresInSeconds: 120 };
}

export type RedeemCheck =
  | {
      ok: true;
      travellerName: string;
      rewardTitle: string;
      discountType: string;
      discountValue: string | null;
      minBillMinor: number | null;
    }
  | {
      ok: false;
      reason: "invalid" | "already_redeemed" | "expired" | "wrong_venue" | "void" | "not_active";
      detail?: string;
    };

async function checkRedeemable(userRewardId: string, vendorProfileId: string, client: DbOrTx = db): Promise<RedeemCheck> {
  const row = await getUserRewardById(userRewardId, client);
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
  // The underlying reward itself may have been paused/expired, or fallen
  // outside its window, after this voucher was already claimed — the
  // voucher's own status/expiresAt only track its own lifecycle, so this
  // is a second, independent check against the reward.
  if (row.reward.status !== "active" || !withinRewardWindow(row.reward)) {
    return { ok: false, reason: "not_active" };
  }

  const traveller = await getTravellerProfileById(row.userReward.travellerId);

  return {
    ok: true,
    travellerName: traveller?.displayName ?? "Traveller",
    rewardTitle: row.reward.title,
    discountType: row.reward.discountType,
    discountValue: row.reward.discountValue,
    minBillMinor: row.reward.minBillMinor,
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

  const result = await withRlsContext(
    { userId: session.userId, role: "vendor", vendorProfileId: vendorProfile.id },
    (tx) => checkRedeemable(decoded.userRewardId, vendorProfile.id, tx),
  );
  return { ...result, userRewardId: decoded.userRewardId };
}

/** Reward codes are shown as WANO-XXXX, but staff may type them without the
 * hyphen or with stray spaces — normalize to the stored shape before
 * comparing. Plain pre-existing (un-prefixed) codes pass through unchanged. */
function normalizeRedemptionCode(input: string) {
  const cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (cleaned.startsWith("WANO") && !cleaned.startsWith("WANO-")) {
    return `WANO-${cleaned.slice(4)}`;
  }
  return cleaned;
}

export async function lookupRewardByCodeForVendor(code: string): Promise<RedeemCheck & { userRewardId?: string }> {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return { ok: false, reason: "invalid" };

  // Resolved under an admin-equivalent context, not this vendor's own —
  // otherwise a code for someone else's venue would be invisible to this
  // lookup entirely (RLS-filtered out) rather than found and correctly
  // rejected as "wrong_venue" by checkRedeemable just below, same
  // distinction the UI already relies on.
  const row = await withRlsContext({ role: "admin" }, (tx) =>
    tx
      .select({ id: userRewards.id })
      .from(userRewards)
      .where(eq(userRewards.redemptionCode, normalizeRedemptionCode(code)))
      .limit(1)
      .then((rows) => rows[0]),
  );
  if (!row) return { ok: false, reason: "invalid" };

  const result = await withRlsContext(
    { userId: session.userId, role: "vendor", vendorProfileId: vendorProfile.id },
    (tx) => checkRedeemable(row.id, vendorProfile.id, tx),
  );
  return { ...result, userRewardId: row.id };
}

/** Computes the actual amount discounted for one redemption, and — for a
 * "points" reward — the points to grant instead. billAmountMinor is only
 * ever required for "spend_perk" (to check the minimum and compute the
 * perk) and "percent" (to turn a percentage into an amount); "fixed" and
 * "freebie" don't need one. Returns an error string on a bad bill amount,
 * or the computed { discountAmountMinor, pointsToGrant } otherwise. */
function computeRedemptionAmounts(
  reward: typeof rewards.$inferSelect,
  billAmountMinor: number | null,
): { error: string } | { discountAmountMinor: number | null; pointsToGrant: number | null } {
  const value = reward.discountValue ? Number.parseFloat(reward.discountValue) : 0;

  if (reward.discountType === "points") {
    return { discountAmountMinor: null, pointsToGrant: Math.round(value) };
  }
  if (reward.discountType === "freebie") {
    return { discountAmountMinor: 0, pointsToGrant: null };
  }
  if (reward.discountType === "fixed") {
    return { discountAmountMinor: roundMinor(value), pointsToGrant: null };
  }
  // percent and spend_perk both need a real bill to turn a percentage into
  // an amount — spend_perk additionally requires it to clear the minimum.
  if (billAmountMinor == null || billAmountMinor < 0) {
    return { error: "Enter the bill amount." };
  }
  if (reward.discountType === "spend_perk" && (reward.minBillMinor == null || billAmountMinor < reward.minBillMinor)) {
    return { error: `The bill must be at least ${reward.minBillMinor?.toLocaleString() ?? 0} UGX for this perk.` };
  }
  return { discountAmountMinor: roundMinor((billAmountMinor * value) / 100), pointsToGrant: null };
}

export async function markRewardRedeemedAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userRewardId = formData.get("userRewardId");
  const pin = formData.get("pin");
  const billAmountRaw = formData.get("billAmountMinor");
  const billAmountMinor =
    typeof billAmountRaw === "string" && billAmountRaw.trim() ? Number.parseInt(billAmountRaw, 10) : null;
  if (typeof userRewardId !== "string" || !userRewardId) return { error: "Missing voucher." };
  if (typeof pin !== "string" || !pin) return { error: "Enter the venue PIN." };

  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return { error: "Vendor profile not found." };
  if (!vendorProfile.staffPinHash) return { error: "Set a venue PIN first, in Redeem settings." };

  const pinValid = await bcrypt.compare(pin, vendorProfile.staffPinHash);
  if (!pinValid) return { error: "Incorrect PIN." };

  const result = await withRlsContext(
    { userId: session.userId, role: "vendor", vendorProfileId: vendorProfile.id },
    async (tx): Promise<{ error: string } | { travellerId: string; pointsGranted: number | null }> => {
      // Advisory lock scoped to this one voucher — the same pattern
      // redeemPointsRewardAction already uses for its per-traveller spend
      // lock (pg_advisory_xact_lock(hashtext(...))). This serializes any
      // two concurrent redemption attempts for the same voucher (a
      // double-scan, or a scan racing a manual-code entry) so the second
      // one always sees the first one's committed status change before it
      // re-checks — the WHERE status='claimed' guard on the UPDATE below
      // is defense-in-depth on top of that, not the only thing preventing
      // a double redemption.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userRewardId}))`);

      const check = await checkRedeemable(userRewardId, vendorProfile.id, tx);
      if (!check.ok) {
        const messages: Record<typeof check.reason, string> = {
          invalid: "Voucher not found.",
          already_redeemed: `Already redeemed${check.detail ? ` (${check.detail})` : ""}.`,
          expired: "This voucher has expired.",
          wrong_venue: "This voucher isn't for your venue.",
          void: "This voucher was voided.",
          not_active: "This reward isn't currently active.",
        };
        return { error: messages[check.reason] };
      }

      const full = await getUserRewardById(userRewardId, tx);
      if (!full) return { error: "Voucher not found." };

      const amounts = computeRedemptionAmounts(full.reward, billAmountMinor);
      if ("error" in amounts) return { error: amounts.error };

      const updated = await tx
        .update(userRewards)
        .set({
          status: "redeemed",
          redeemedAt: new Date(),
          redeemedByVendorProfileId: vendorProfile.id,
          billAmountMinor,
          discountAmountMinor: amounts.discountAmountMinor,
        })
        .where(and(eq(userRewards.id, userRewardId), eq(userRewards.status, "claimed")))
        .returning({ id: userRewards.id });
      // The WHERE status='claimed' guard means a losing concurrent
      // redemption updates zero rows instead of two both succeeding —
      // this is the actual "impossible to redeem twice" guarantee; the
      // advisory lock above just makes the race resolve deterministically
      // instead of both transactions reading "claimed" simultaneously.
      if (updated.length === 0) return { error: "Already redeemed." };

      if (amounts.pointsToGrant) {
        await tx.insert(pointsLedger).values({
          travellerId: full.userReward.travellerId,
          delta: amounts.pointsToGrant,
          reason: `Redeemed "${full.reward.title}"`,
          sourceType: "reward_redemption",
          sourceId: userRewardId,
        });
      }

      return { travellerId: full.userReward.travellerId, pointsGranted: amounts.pointsToGrant };
    },
  );
  if ("error" in result) return { error: result.error };

  await notifyRewardRedeemed(userRewardId);
  await enforceBudgetCapIfNeeded(session.userId);

  revalidateRewardPaths();
  revalidatePath("/passport");

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
  discountType: z.enum(["percent", "fixed", "freebie", "spend_perk", "points"]),
  discountValue: z.string().optional().or(z.literal("")),
  minBillMinor: z.coerce.number().int().min(0).optional(),
  source: z.enum(["manual", "funzone", "xp_draw", "points_shop"]),
  pointsCost: z.coerce.number().int().optional(),
  fundedBy: z.string().optional().or(z.literal("")),
  wanoSharePct: z.coerce.number().int().min(0).max(100).optional(),
  totalCap: z.coerce.number().int().min(1).optional(),
  perUserCap: z.coerce.number().int().min(1).default(1),
  startsAt: z.string().optional().or(z.literal("")),
  endsAt: z.string().optional().or(z.literal("")),
  defaultValidityDays: z.coerce.number().int().min(1).max(365),
});

function rewardFieldsFromFormData(formData: FormData) {
  return rewardSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    target: formData.get("target"),
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue") ?? "",
    minBillMinor: formData.get("minBillMinor") || undefined,
    source: formData.get("source") || "manual",
    pointsCost: formData.get("pointsCost") || undefined,
    fundedBy: formData.get("fundedBy") ?? "",
    wanoSharePct: formData.get("wanoSharePct") || undefined,
    totalCap: formData.get("totalCap") || undefined,
    perUserCap: formData.get("perUserCap") || "1",
    startsAt: formData.get("startsAt") ?? "",
    endsAt: formData.get("endsAt") ?? "",
    defaultValidityDays: formData.get("defaultValidityDays") || "30",
  });
}

function validateRewardFields(data: z.infer<typeof rewardSchema>): string | null {
  if (data.discountType !== "freebie" && !data.discountValue) return "Enter a discount value.";
  if (data.discountType === "spend_perk" && !data.minBillMinor) {
    return "Enter the minimum bill for this spend-based perk.";
  }
  if (data.source === "points_shop" && (!data.pointsCost || data.pointsCost < 1)) {
    return "Enter how many points this reward costs to redeem.";
  }
  return null;
}

export async function createRewardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdminLevel("super");

  const parsed = rewardFieldsFromFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the reward fields." };
  }

  // target is "listing:<uuid>" or "event:<uuid>" — same scope-picker pattern
  // as admin promotions.
  const [kind, id] = parsed.data.target.split(":");
  if ((kind !== "listing" && kind !== "event") || !id) {
    return { error: "Pick what this reward applies to." };
  }
  const fieldError = validateRewardFields(parsed.data);
  if (fieldError) return { error: fieldError };

  const [created] = await withRlsContext({ role: "admin" }, (tx) =>
    tx
      .insert(rewards)
      .values({
        title: parsed.data.title,
        description: parsed.data.description || null,
        targetType: kind,
        targetId: id,
        discountType: parsed.data.discountType,
        discountValue: parsed.data.discountType === "freebie" ? null : parsed.data.discountValue || null,
        minBillMinor: parsed.data.discountType === "spend_perk" ? parsed.data.minBillMinor : null,
        source: parsed.data.source,
        pointsCost: parsed.data.source === "points_shop" ? parsed.data.pointsCost : null,
        fundedBy: parsed.data.fundedBy || null,
        wanoSharePct: parsed.data.wanoSharePct ?? null,
        totalCap: parsed.data.totalCap ?? null,
        perUserCap: parsed.data.perUserCap,
        startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
        defaultValidityDays: parsed.data.defaultValidityDays,
      })
      .returning(),
  );
  await logAdminAction(session.userId, "reward.created", `Created reward "${parsed.data.title}"`, {
    type: "reward",
    id: created.id,
  });

  revalidateRewardPaths();

  return {};
}

/** Edits an existing reward's catalog fields — same shape as
 * createRewardAction, applied to an existing row instead of inserting a
 * new one. status/active are left untouched here — see
 * setRewardStatusAction for pause/resume/expire. */
export async function updateRewardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdminLevel("super");

  const rewardId = formData.get("rewardId");
  if (typeof rewardId !== "string" || !rewardId) return { error: "Missing reward." };

  const parsed = rewardFieldsFromFormData(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the reward fields." };
  }
  const [kind, id] = parsed.data.target.split(":");
  if ((kind !== "listing" && kind !== "event") || !id) {
    return { error: "Pick what this reward applies to." };
  }
  const fieldError = validateRewardFields(parsed.data);
  if (fieldError) return { error: fieldError };

  const updated = await withRlsContext({ role: "admin" }, (tx) =>
    tx
      .update(rewards)
      .set({
        title: parsed.data.title,
        description: parsed.data.description || null,
        targetType: kind,
        targetId: id,
        discountType: parsed.data.discountType,
        discountValue: parsed.data.discountType === "freebie" ? null : parsed.data.discountValue || null,
        minBillMinor: parsed.data.discountType === "spend_perk" ? parsed.data.minBillMinor : null,
        pointsCost: parsed.data.source === "points_shop" ? parsed.data.pointsCost : null,
        fundedBy: parsed.data.fundedBy || null,
        wanoSharePct: parsed.data.wanoSharePct ?? null,
        totalCap: parsed.data.totalCap ?? null,
        perUserCap: parsed.data.perUserCap,
        startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
        endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
        defaultValidityDays: parsed.data.defaultValidityDays,
      })
      .where(eq(rewards.id, rewardId))
      .returning({ id: rewards.id }),
  );
  if (updated.length === 0) return { error: "Reward not found." };

  await logAdminAction(session.userId, "reward.updated", `Updated reward "${parsed.data.title}"`, {
    type: "reward",
    id: rewardId,
  });

  revalidateRewardPaths();
  return {};
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
    const existingReward = await withRlsContext(
      { userId: session.userId, role: "vendor", vendorProfileId: vendorProfile.id },
      (tx) => tx.select().from(rewards).where(eq(rewards.id, rewardId)).limit(1).then((rows) => rows[0]),
    );
    if (!existingReward) return { error: "Reward not found." };
    const existingOwner = await getOwningVendorProfileId(existingReward.targetType, existingReward.targetId);
    if (existingOwner !== vendorProfile.id) return { error: "You can only edit your own rewards." };
  }

  const payload = parsed.data as unknown as Record<string, unknown>;
  await withRlsContext(
    { userId: session.userId, role: "vendor", vendorProfileId: vendorProfile.id },
    async (tx) => {
      const existing = rewardId ? await getPendingEditSubmission(vendorProfile.id, "reward", rewardId, tx) : null;
      if (existing) {
        await tx
          .update(vendorSubmissions)
          .set({ payload, status: "pending", reviewNotes: null, updatedAt: new Date() })
          .where(eq(vendorSubmissions.id, existing.id));
      } else {
        await tx
          .insert(vendorSubmissions)
          .values({ vendorProfileId: vendorProfile.id, entityType: "reward", entityId: rewardId, payload });
      }
    },
  );

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

  await withRlsContext(
    { userId: session.userId, role: "vendor", vendorProfileId: vendorProfile.id },
    async (tx) => {
      const [row] = await tx.select().from(vendorSubmissions).where(eq(vendorSubmissions.id, submissionId)).limit(1);
      if (!row || row.vendorProfileId !== vendorProfile.id || row.status !== "pending") {
        throw new Error("Submission not found.");
      }
      await tx.delete(vendorSubmissions).where(eq(vendorSubmissions.id, submissionId));
    },
  );
  revalidatePath("/vendor/dashboard/rewards");
}

export type RewardStatus = "draft" | "active" | "paused" | "expired";

/** Sets a reward's catalog status — draft/active/paused/expired — and
 * keeps the legacy `active` boolean in sync (active = status === "active")
 * since funzone-actions.ts/xp-actions.ts still read that column directly. */
export async function setRewardStatusAction(rewardId: string, status: RewardStatus) {
  const session = await requireAdminLevel("super");

  await withRlsContext({ role: "admin" }, (tx) =>
    tx
      .update(rewards)
      .set({ status, active: status === "active" })
      .where(eq(rewards.id, rewardId)),
  );
  await logAdminAction(session.userId, "reward.status_set", `Set reward status to "${status}"`, {
    type: "reward",
    id: rewardId,
  });

  revalidateRewardPaths();
}

const voidReasonSchema = z.string().trim().min(3, "A reason is required.").max(500);

/** Voids a voucher — the only way to take back an unredeemed one already
 * in a traveller's wallet (an expired one already stops being usable on
 * its own). Requires a reason; only ever an admin action, never a vendor
 * or the traveller themselves. */
export async function voidVoucherAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdminLevel("super");

  const userRewardId = formData.get("userRewardId");
  if (typeof userRewardId !== "string" || !userRewardId) return { error: "Missing voucher." };

  const parsedReason = voidReasonSchema.safeParse(formData.get("reason"));
  if (!parsedReason.success) return { error: parsedReason.error.issues[0]?.message ?? "A reason is required." };

  const updated = await withRlsContext({ role: "admin" }, (tx) =>
    tx
      .update(userRewards)
      .set({ status: "void", voidReason: parsedReason.data, voidedByUserId: session.userId })
      .where(and(eq(userRewards.id, userRewardId), eq(userRewards.status, "claimed")))
      .returning({ id: userRewards.id }),
  );
  if (updated.length === 0) return { error: "Only an unredeemed voucher can be voided." };

  await logAdminAction(session.userId, "voucher.voided", `Voided voucher: ${parsedReason.data}`, {
    type: "user_reward",
    id: userRewardId,
  });

  revalidateRewardPaths();
  return {};
}
