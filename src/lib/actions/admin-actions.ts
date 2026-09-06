"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  accreditationReviews,
  bookings,
  listingImages,
  listings,
  stamps,
  travellerProfiles,
  users,
  vendorDocuments,
  vendorProfiles,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { generatePlaceAddedItemsForVendor } from "@/lib/feed-generators";
import { applyListingContent, applyVendorSocialLinks, listingContentSchema } from "@/lib/actions/listing-shared";
import { notifyTravellerOfBookingStatus } from "@/lib/booking-notifications";
import { awardReferralCreditOnFirstBooking } from "@/lib/data/traveller";
import { notifyUser } from "@/lib/notify";
import type { ActionState } from "@/lib/validation";

const MAX_LISTING_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_LISTING_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function setAccreditationStatusAction(
  vendorProfileId: string,
  status: "trusted" | "rejected" | "pending",
  notes?: string,
) {
  const session = await requireRole("admin");

  await db
    .update(vendorProfiles)
    .set({ accreditationStatus: status })
    .where(eq(vendorProfiles.id, vendorProfileId));

  await db.insert(accreditationReviews).values({
    vendorProfileId,
    reviewerUserId: session.userId,
    decision: status,
    notes: notes || null,
  });

  // Listings created before this vendor was trusted never got a
  // place_added feed item (the generator no-ops until accreditation
  // clears) — backfill them now that it has.
  if (status === "trusted") await generatePlaceAddedItemsForVendor(vendorProfileId);

  if (status === "trusted" || status === "rejected") {
    const [vendorRow] = await db
      .select({ businessName: vendorProfiles.businessName, email: users.email })
      .from(vendorProfiles)
      .innerJoin(users, eq(users.id, vendorProfiles.userId))
      .where(eq(vendorProfiles.id, vendorProfileId))
      .limit(1);
    if (vendorRow) {
      const message =
        status === "trusted"
          ? "You're Wano-verified — your listing is now live for travellers to find and book."
          : "Your accreditation was not approved this time.";
      await notifyUser(vendorRow.email, status === "trusted" ? "You're verified on Wano" : "Accreditation update", [
        `<strong>${vendorRow.businessName}</strong>: ${message}`,
        ...(notes ? [`Notes: ${notes}`] : []),
      ]);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/vendors");
  revalidatePath(`/admin/vendors/${vendorProfileId}`);
  revalidatePath("/journeys");
}

export async function reviewVendorDocumentAction(
  documentId: string,
  status: "approved" | "rejected",
) {
  const session = await requireRole("admin");

  await db
    .update(vendorDocuments)
    .set({ status, reviewedByUserId: session.userId, reviewedAt: new Date() })
    .where(eq(vendorDocuments.id, documentId));

  revalidatePath("/admin/vendors");
}

const adminListingSchema = listingContentSchema.extend({
  vendorProfileId: z.string().uuid(),
  listingId: z.string().uuid().optional().or(z.literal("")),
  isPublished: z.boolean(),
});

export async function upsertVendorListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("admin");

  const parsed = adminListingSchema.safeParse({
    vendorProfileId: formData.get("vendorProfileId"),
    listingId: formData.get("listingId") ?? "",
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description"),
    priceLabel: formData.get("priceLabel") ?? "",
    priceMinor: formData.get("priceMinor"),
    currency: formData.get("currency") ?? "",
    priceUnit: formData.get("priceUnit") ?? "",
    isPublished: formData.get("isPublished") === "on",
    externalBookingUrl: formData.get("externalBookingUrl") ?? "",
    latitude: formData.get("latitude") ?? "",
    longitude: formData.get("longitude") ?? "",
    journeyIds: formData.getAll("journeyIds"),
    discountText: formData.get("discountText"),
    freebieText: formData.get("freebieText") ?? "",
    hotelRoomTypes: formData.get("hotelRoomTypes") ?? "",
    hotelAmenities: formData.get("hotelAmenities") ?? "",
    hotelCheckIn: formData.get("hotelCheckIn") ?? "",
    hotelCheckOut: formData.get("hotelCheckOut") ?? "",
    restaurantCuisine: formData.get("restaurantCuisine") ?? "",
    restaurantPriceRange: formData.get("restaurantPriceRange") ?? "",
    restaurantHours: formData.get("restaurantHours") ?? "",
    experienceDuration: formData.get("experienceDuration") ?? "",
    experienceGroupSize: formData.get("experienceGroupSize") ?? "",
    experienceIncluded: formData.get("experienceIncluded") ?? "",
    instagramUrl: formData.get("instagramUrl") ?? "",
    facebookUrl: formData.get("facebookUrl") ?? "",
    tiktokUrl: formData.get("tiktokUrl") ?? "",
    websiteUrl: formData.get("websiteUrl") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the listing fields." };
  }
  const d = parsed.data;

  const images = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of images) {
    if (file.size > MAX_LISTING_IMAGE_BYTES) return { error: "Each photo must be under 8MB." };
    if (!ALLOWED_LISTING_IMAGE_TYPES.has(file.type)) return { error: "Photos must be JPG, PNG, or WebP." };
  }

  await applyVendorSocialLinks(d.vendorProfileId, d);
  const listingId = await applyListingContent(d.listingId || null, d.vendorProfileId, d);
  await db.update(listings).set({ isPublished: d.isPublished }).where(eq(listings.id, listingId));

  if (images.length > 0) {
    const existing = await db
      .select({ id: listingImages.id })
      .from(listingImages)
      .where(eq(listingImages.listingId, listingId));
    for (let i = 0; i < images.length; i++) {
      const buffer = Buffer.from(await images[i].arrayBuffer());
      await db.insert(listingImages).values({
        listingId,
        data: buffer,
        mimeType: images[i].type,
        sortOrder: existing.length + i,
      });
    }
  }

  revalidatePath("/admin/vendors");
  revalidatePath(`/admin/vendors/${d.vendorProfileId}`);
  revalidatePath("/journeys");
  revalidatePath("/explore");
  revalidatePath(`/explore/${listingId}`);
  revalidatePath("/");
  revalidatePath("/partners");

  return {};
}

export async function deleteListingImageAction(imageId: string, vendorProfileId: string) {
  await requireRole("admin");
  await db.delete(listingImages).where(eq(listingImages.id, imageId));

  revalidatePath(`/admin/vendors/${vendorProfileId}`);
  revalidatePath("/explore");
  revalidatePath("/journeys");
  revalidatePath("/");
  revalidatePath("/partners");
}

export async function adminSetBookingStatusAction(
  bookingId: string,
  status: "pending" | "confirmed" | "completed" | "cancelled",
) {
  await requireRole("admin");

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) throw new Error("Booking not found.");

  await db.update(bookings).set({ status }).where(eq(bookings.id, bookingId));

  if (status === "confirmed" && booking.journeyId) {
    const [existingStamp] = await db
      .select()
      .from(stamps)
      .where(and(eq(stamps.travellerId, booking.travellerId), eq(stamps.journeyId, booking.journeyId)))
      .limit(1);

    if (!existingStamp) {
      await db.insert(stamps).values({
        travellerId: booking.travellerId,
        journeyId: booking.journeyId,
        bookingId: booking.id,
      });
    }
  }

  if (status === "confirmed") {
    await awardReferralCreditOnFirstBooking(booking.travellerId);
  }

  if (status !== booking.status) await notifyTravellerOfBookingStatus(bookingId, status);

  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/passport");
  revalidatePath("/dashboard/discounts");
  revalidatePath("/dashboard/bookings");
  revalidatePath("/vendor/dashboard/bookings");
  revalidatePath("/vendor/dashboard/referrals");
}

/** Admin renaming a traveller — keeps travellerProfiles.displayName (shown
 * on profile/social/feed) and users.name (shown in admin lists and emails)
 * in sync, since nothing else updates both together. */
export async function updateTravellerNameAction(travellerId: string, name: string) {
  await requireRole("admin");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name can't be empty.");

  const [traveller] = await db.select().from(travellerProfiles).where(eq(travellerProfiles.id, travellerId)).limit(1);
  if (!traveller) throw new Error("Traveller not found.");

  await Promise.all([
    db.update(travellerProfiles).set({ displayName: trimmed }).where(eq(travellerProfiles.id, travellerId)),
    db.update(users).set({ name: trimmed }).where(eq(users.id, traveller.userId)),
  ]);

  revalidatePath("/admin/travellers");
  revalidatePath("/social");
}
