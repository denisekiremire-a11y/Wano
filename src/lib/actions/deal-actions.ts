"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { dealClaims } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";

export async function claimDealFormAction(formData: FormData) {
  const promoCodeId = formData.get("promoCodeId");
  if (typeof promoCodeId !== "string" || !promoCodeId) throw new Error("Missing deal.");

  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) throw new Error("Traveller profile not found.");

  const [existing] = await db
    .select()
    .from(dealClaims)
    .where(and(eq(dealClaims.travellerId, travellerProfile.id), eq(dealClaims.promoCodeId, promoCodeId)))
    .limit(1);

  if (!existing) {
    await db.insert(dealClaims).values({ travellerId: travellerProfile.id, promoCodeId });
  }

  revalidatePath("/profile");
  revalidatePath("/explore");
}
