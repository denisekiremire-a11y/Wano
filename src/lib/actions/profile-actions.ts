"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { travellerProfiles } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import type { ActionState } from "@/lib/validation";

const birthdaySchema = z.object({
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date."),
});

export async function updateBirthdayAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole("traveller");
  const parsed = birthdaySchema.safeParse({ dateOfBirth: formData.get("dateOfBirth") });
  if (!parsed.success) return { error: "Enter a valid birthday." };

  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Profile not found." };

  await db
    .update(travellerProfiles)
    .set({ dateOfBirth: parsed.data.dateOfBirth })
    .where(eq(travellerProfiles.id, travellerProfile.id));

  revalidatePath("/passport");
  return {};
}

export async function setFeedActivityVisibilityAction(showActivityInFeed: boolean) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return;

  await db
    .update(travellerProfiles)
    .set({ showActivityInFeed })
    .where(eq(travellerProfiles.id, travellerProfile.id));

  revalidatePath("/social");
  revalidatePath("/passport");
}
