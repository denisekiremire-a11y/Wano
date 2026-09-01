"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { promoCodes } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { generatePerkAddedItem } from "@/lib/feed-generators";
import type { ActionState } from "@/lib/validation";

const promoSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(30)
    .transform((v) => v.toUpperCase().trim()),
  title: z.string().min(2).max(120),
  discountText: z.string().min(2).max(200),
  freebieText: z.string().max(200).optional().or(z.literal("")),
  scope: z.string(),
  expiresAt: z.string().optional().or(z.literal("")),
});

function revalidatePromoPaths() {
  revalidatePath("/admin/promotions");
  revalidatePath("/dashboard/discounts");
  revalidatePath("/journeys");
  revalidatePath("/partners");
  revalidatePath("/");
}

export async function createPromoCodeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("admin");

  const parsed = promoSchema.safeParse({
    code: formData.get("code"),
    title: formData.get("title"),
    discountText: formData.get("discountText"),
    freebieText: formData.get("freebieText") ?? "",
    scope: formData.get("scope") ?? "",
    expiresAt: formData.get("expiresAt") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the promo code fields." };
  }

  // scope is "" (platform-wide), "journey:<uuid>", or "listing:<uuid>".
  let journeyId: string | null = null;
  let listingId: string | null = null;
  const [kind, id] = parsed.data.scope.split(":");
  if (kind === "journey" && id) journeyId = id;
  if (kind === "listing" && id) listingId = id;

  const [existing] = await db
    .select({ id: promoCodes.id })
    .from(promoCodes)
    .where(eq(promoCodes.code, parsed.data.code))
    .limit(1);
  if (existing) return { error: "That code already exists." };

  const [created] = await db
    .insert(promoCodes)
    .values({
      code: parsed.data.code,
      title: parsed.data.title,
      discountText: parsed.data.discountText,
      freebieText: parsed.data.freebieText || null,
      journeyId,
      listingId,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    })
    .returning();

  await generatePerkAddedItem(created.id);

  revalidatePromoPaths();

  return {};
}

export async function togglePromoCodeAction(promoId: string, active: boolean) {
  await requireRole("admin");

  await db.update(promoCodes).set({ active }).where(eq(promoCodes.id, promoId));

  revalidatePromoPaths();
}
