"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { clubs } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getVendorProfileByUserId } from "@/lib/data/vendor";
import type { ActionState } from "@/lib/validation";

const clubSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(600),
  interestId: z.string().uuid(),
});

/** A vendor submitting their own business's club — starts "pending" until
 * an admin reviews it. The submitting vendor is automatically the club's
 * "run by" partner. */
export async function submitClubAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return { error: "Vendor profile not found." };

  const parsed = clubSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    interestId: formData.get("interestId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the club details." };
  }

  await db.insert(clubs).values({
    ...parsed.data,
    vendorProfileId: vendorProfile.id,
    createdByUserId: session.userId,
    status: "pending",
  });

  revalidatePath("/vendor/dashboard/clubs");
  revalidatePath("/admin/clubs");
  return {};
}

/** Admin creating a club directly — live immediately, vendor link optional. */
const adminClubSchema = clubSchema.extend({
  vendorProfileId: z.string().uuid().optional().or(z.literal("")),
});

export async function createClubAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("admin");

  const parsed = adminClubSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    interestId: formData.get("interestId"),
    vendorProfileId: formData.get("vendorProfileId") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the club details." };
  }

  await db.insert(clubs).values({
    name: parsed.data.name,
    description: parsed.data.description,
    interestId: parsed.data.interestId,
    vendorProfileId: parsed.data.vendorProfileId || null,
    createdByUserId: session.userId,
    reviewedByUserId: session.userId,
    status: "approved",
  });

  revalidatePath("/admin/clubs");
  revalidatePath("/social");
  return {};
}

export async function reviewClubAction(clubId: string, status: "approved" | "rejected", notes?: string) {
  const session = await requireRole("admin");

  await db
    .update(clubs)
    .set({ status, reviewedByUserId: session.userId, reviewNotes: notes || null })
    .where(eq(clubs.id, clubId));

  revalidatePath("/admin/clubs");
  revalidatePath("/vendor/dashboard/clubs");
  revalidatePath("/social");
}
