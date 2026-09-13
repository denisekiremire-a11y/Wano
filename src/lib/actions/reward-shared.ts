import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { rewards } from "@/db/schema";

// The vendor-facing subset of reward fields — no source/fundedBy, those are
// ops-level knobs (which flow issues it, who funds it commercially) that
// stay admin-only. Shared by the vendor's submit action and the admin
// approval flow that applies it, so both stay in sync.
//
// This lives outside reward-actions.ts (a "use server" file) deliberately —
// Next.js requires every export from a "use server" file to be an async
// function, and a zod schema is a plain object, which broke the production
// build (Turbopack's local build didn't catch it; Vercel's does).
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
