"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { dailyDrops, listings, rewards, userRewards, vendorProfiles } from "@/db/schema";
import { mintUserReward } from "@/lib/actions/reward-actions";
import { logAdminAction } from "@/lib/admin-action-log";
import { requireAdminPage, requireRole } from "@/lib/auth";
import { checkDropIdentity, getDropById, getDropNoShows } from "@/lib/data/drops";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { withRlsContext } from "@/lib/db-context";
import {
  DROP_DEFAULT_CAP,
  DROP_DEFAULT_REDEEM_FROM,
  DROP_DEFAULT_REDEEM_UNTIL,
  dropPausedUntil,
  dropWindows,
} from "@/lib/drops";
import { formatKampalaDateTime } from "@/lib/kampala-time";
import type { ActionState } from "@/lib/validation";

function revalidateDropPaths() {
  revalidatePath("/");
  revalidatePath("/drops");
  revalidatePath("/admin/drops");
  revalidatePath("/passport");
  revalidatePath("/vendor/dashboard");
}

const time = z.string().regex(/^\d{2}:\d{2}$/, "Use a time like 17:00.");

const dropSchema = z.object({
  dropDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the Drop date."),
  listingId: z.string().uuid("Pick the venue."),
  title: z.string().min(3).max(120),
  description: z.string().max(500).optional().or(z.literal("")),
  discountType: z.enum(["freebie", "percent", "fixed"]),
  discountValue: z.string().optional().or(z.literal("")),
  cap: z.coerce.number().int().min(1).max(200),
  redeemFrom: time,
  redeemUntil: time,
});

/** Admin schedules one Drop for a date, on a vendor's behalf (vendors pick
 * their quiet day with Wano; vendor self-service comes with the vendor
 * tools). One Drop per date, enforced by the unique date. */
export async function createDropAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdminPage("/admin/drops");
  const parsed = dropSchema.safeParse({
    dropDate: formData.get("dropDate"),
    listingId: formData.get("listingId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    discountType: formData.get("discountType"),
    discountValue: formData.get("discountValue") ?? "",
    cap: formData.get("cap") || DROP_DEFAULT_CAP,
    redeemFrom: formData.get("redeemFrom") || DROP_DEFAULT_REDEEM_FROM,
    redeemUntil: formData.get("redeemUntil") || DROP_DEFAULT_REDEEM_UNTIL,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the Drop fields." };
  const data = parsed.data;
  if (data.discountType !== "freebie" && !data.discountValue) return { error: "Enter the discount amount." };

  const windows = dropWindows(data.dropDate, data.redeemFrom, data.redeemUntil);
  if (windows.redeemUntil <= new Date()) return { error: "That Drop would already be over. Pick a later date." };

  const [listing] = await db
    .select({ id: listings.id })
    .from(listings)
    .innerJoin(vendorProfiles, eq(listings.vendorProfileId, vendorProfiles.id))
    .where(and(eq(listings.id, data.listingId), eq(vendorProfiles.accreditationStatus, "trusted")))
    .limit(1);
  if (!listing) return { error: "That venue isn't a verified partner listing." };

  const [taken] = await db.select({ id: dailyDrops.id }).from(dailyDrops).where(eq(dailyDrops.dropDate, data.dropDate)).limit(1);
  if (taken) return { error: "There's already a Drop on that date. One Drop per day." };

  const drop = await withRlsContext({ userId: session.userId, role: "admin" }, async (tx) => {
    const [reward] = await tx
      .insert(rewards)
      .values({
        title: data.title,
        description: data.description || null,
        targetType: "listing",
        targetId: data.listingId,
        discountType: data.discountType,
        discountValue: data.discountType === "freebie" ? null : data.discountValue || null,
        source: "drop",
        fundedBy: "vendor",
        totalCap: data.cap,
        perUserCap: 1,
        startsAt: windows.claimsOpenAt,
        endsAt: windows.redeemUntil,
        defaultValidityDays: 1,
      })
      .returning({ id: rewards.id });
    const [row] = await tx
      .insert(dailyDrops)
      .values({ dropDate: data.dropDate, rewardId: reward.id, ...windows, createdByUserId: session.userId })
      .returning({ id: dailyDrops.id });
    return row;
  });

  await logAdminAction(session.userId, "drop.created", `Scheduled Daily Drop "${data.title}" for ${data.dropDate}`, {
    type: "daily_drop",
    id: drop.id,
  });
  revalidateDropPaths();
  return {};
}

/** Cancels a Drop: the perk is paused and any vouchers already claimed are
 * voided with a reason, so nobody turns up to a perk that won't be honoured. */
export async function cancelDropAction(dropId: string) {
  const session = await requireAdminPage("/admin/drops");
  const drop = await getDropById(dropId);
  if (!drop) throw new Error("Drop not found.");

  await withRlsContext({ userId: session.userId, role: "admin" }, async (tx) => {
    await tx.update(rewards).set({ status: "paused", active: false }).where(eq(rewards.id, drop.rewardId));
    await tx
      .update(userRewards)
      .set({ status: "void", voidReason: "Daily Drop cancelled", voidedByUserId: session.userId })
      .where(and(eq(userRewards.rewardId, drop.rewardId), eq(userRewards.status, "claimed")));
  });

  await logAdminAction(session.userId, "drop.cancelled", `Cancelled Daily Drop "${drop.title}" for ${drop.dropDate}`, {
    type: "daily_drop",
    id: drop.dropId,
  });
  revalidateDropPaths();
}

/** A member claims a Drop voucher. Rules: one per Drop (the reward's
 * per-user cap), a verified identity, no no-show pause, and only while the
 * Drop is open (from 17:00 the day before until its redeem window ends,
 * or until the cap runs out). */
export async function claimDropAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const dropId = formData.get("dropId");
  if (typeof dropId !== "string" || !dropId) return { error: "Missing Drop." };

  const session = await requireRole("traveller");
  const traveller = await getTravellerProfileByUserId(session.userId);
  if (!traveller) return { error: "Traveller profile not found." };

  const drop = await getDropById(dropId);
  if (!drop) return { error: "That Drop isn't available." };
  if (drop.phase === "announced_soon") return { error: "This Drop opens at 5 pm the day before." };
  if (drop.phase === "over") return { error: "This Drop has ended." };

  const identity = await checkDropIdentity(traveller.id);
  if (!identity.ok) {
    return {
      error:
        identity.need === "phone"
          ? "Verify your phone number to claim Drops."
          : "Verify your email address to claim Drops.",
    };
  }

  const pausedUntil = dropPausedUntil(await getDropNoShows(traveller.id), new Date());
  if (pausedUntil) {
    return {
      error: `You missed three Drops in the last 30 days, so Drops are paused for you until ${formatKampalaDateTime(pausedUntil)}.`,
    };
  }

  try {
    await mintUserReward(traveller.id, drop.rewardId, { expiresAt: drop.redeemUntil });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("run out")) return { error: "All the spots for this Drop have gone." };
    if (message.includes("maximum")) return { error: "You've already claimed this Drop." };
    return { error: "This Drop isn't available any more." };
  }

  revalidateDropPaths();
  return {};
}
