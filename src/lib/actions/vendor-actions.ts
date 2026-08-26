"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { listings, offers } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getVendorProfileByUserId } from "@/lib/data/vendor";
import { offerEditSchema, type ActionState } from "@/lib/validation";

export async function updateOfferAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return { error: "Vendor profile not found." };

  const parsed = offerEditSchema.safeParse({
    listingId: formData.get("listingId"),
    discountText: formData.get("discountText"),
    freebieText: formData.get("freebieText") ?? "",
    active: formData.get("active") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the offer fields." };
  }

  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, parsed.data.listingId))
    .limit(1);

  if (!listing || listing.vendorProfileId !== vendorProfile.id) {
    return { error: "You can only edit your own listing's offer." };
  }

  await db
    .update(offers)
    .set({
      discountText: parsed.data.discountText,
      freebieText: parsed.data.freebieText || null,
      active: parsed.data.active,
      updatedAt: new Date(),
    })
    .where(eq(offers.listingId, parsed.data.listingId));

  revalidatePath("/vendor/dashboard");
  revalidatePath("/vendor/dashboard/offer");
  revalidatePath("/journeys");

  return {};
}
