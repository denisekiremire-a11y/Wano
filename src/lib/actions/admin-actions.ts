"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  accreditationReviews,
  bookings,
  experienceDetails,
  hotelDetails,
  listingJourneys,
  listings,
  offers,
  restaurantDetails,
  stamps,
  vendorDocuments,
  vendorProfiles,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { generatePlaceAddedItem, generatePlaceAddedItemsForVendor } from "@/lib/feed-generators";
import type { ActionState } from "@/lib/validation";

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

const listingSchema = z.object({
  vendorProfileId: z.string().uuid(),
  listingId: z.string().uuid().optional().or(z.literal("")),
  type: z.enum(["hotel", "restaurant", "experience", "transport", "spa_salon"]),
  title: z.string().min(2).max(150),
  description: z.string().min(10).max(1000),
  priceHint: z.string().min(1).max(60),
  latitude: z.coerce.number().min(-90).max(90).optional().or(z.literal("")),
  longitude: z.coerce.number().min(-180).max(180).optional().or(z.literal("")),
  journeyIds: z.array(z.string().uuid()).default([]),
  discountText: z.string().min(1).max(200),
  freebieText: z.string().max(200).optional().or(z.literal("")),
  hotelRoomTypes: z.string().max(300).optional().or(z.literal("")),
  hotelAmenities: z.string().max(300).optional().or(z.literal("")),
  hotelCheckIn: z.string().max(20).optional().or(z.literal("")),
  hotelCheckOut: z.string().max(20).optional().or(z.literal("")),
  restaurantCuisine: z.string().max(100).optional().or(z.literal("")),
  restaurantPriceRange: z.string().max(20).optional().or(z.literal("")),
  restaurantHours: z.string().max(100).optional().or(z.literal("")),
  experienceDuration: z.string().max(60).optional().or(z.literal("")),
  experienceGroupSize: z.string().max(60).optional().or(z.literal("")),
  experienceIncluded: z.string().max(300).optional().or(z.literal("")),
  instagramUrl: z.string().url().max(300).optional().or(z.literal("")),
  facebookUrl: z.string().url().max(300).optional().or(z.literal("")),
  tiktokUrl: z.string().url().max(300).optional().or(z.literal("")),
  websiteUrl: z.string().url().max(300).optional().or(z.literal("")),
});

export async function upsertVendorListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("admin");

  const parsed = listingSchema.safeParse({
    vendorProfileId: formData.get("vendorProfileId"),
    listingId: formData.get("listingId") ?? "",
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description"),
    priceHint: formData.get("priceHint"),
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

  await db
    .update(vendorProfiles)
    .set({
      instagramUrl: d.instagramUrl || null,
      facebookUrl: d.facebookUrl || null,
      tiktokUrl: d.tiktokUrl || null,
      websiteUrl: d.websiteUrl || null,
    })
    .where(eq(vendorProfiles.id, d.vendorProfileId));

  const listingValues = {
    vendorProfileId: d.vendorProfileId,
    type: d.type,
    title: d.title,
    description: d.description,
    priceHint: d.priceHint,
    latitude: d.latitude === "" || d.latitude === undefined ? null : String(d.latitude),
    longitude: d.longitude === "" || d.longitude === undefined ? null : String(d.longitude),
  };

  let listingId = d.listingId || "";
  if (listingId) {
    await db.update(listings).set(listingValues).where(eq(listings.id, listingId));
  } else {
    const [created] = await db.insert(listings).values(listingValues).returning();
    listingId = created.id;
    // No-ops if the vendor isn't trusted yet — setAccreditationStatusAction
    // backfills this listing once they are.
    await generatePlaceAddedItem(listingId);
  }

  await db.delete(listingJourneys).where(eq(listingJourneys.listingId, listingId));
  if (d.journeyIds.length > 0) {
    await db
      .insert(listingJourneys)
      .values(d.journeyIds.map((journeyId) => ({ listingId, journeyId })));
  }

  const [existingOffer] = await db
    .select()
    .from(offers)
    .where(eq(offers.listingId, listingId))
    .limit(1);
  if (existingOffer) {
    await db
      .update(offers)
      .set({ discountText: d.discountText, freebieText: d.freebieText || null, updatedAt: new Date() })
      .where(eq(offers.listingId, listingId));
  } else {
    await db.insert(offers).values({
      listingId,
      discountText: d.discountText,
      freebieText: d.freebieText || null,
    });
  }

  if (d.type === "hotel") {
    const values = {
      roomTypes: d.hotelRoomTypes || null,
      amenities: d.hotelAmenities || null,
      checkInTime: d.hotelCheckIn || null,
      checkOutTime: d.hotelCheckOut || null,
    };
    const [existing] = await db
      .select()
      .from(hotelDetails)
      .where(eq(hotelDetails.listingId, listingId))
      .limit(1);
    if (existing) await db.update(hotelDetails).set(values).where(eq(hotelDetails.listingId, listingId));
    else await db.insert(hotelDetails).values({ listingId, ...values });
  } else if (d.type === "restaurant") {
    const values = {
      cuisine: d.restaurantCuisine || null,
      priceRange: d.restaurantPriceRange || null,
      hours: d.restaurantHours || null,
    };
    const [existing] = await db
      .select()
      .from(restaurantDetails)
      .where(eq(restaurantDetails.listingId, listingId))
      .limit(1);
    if (existing)
      await db.update(restaurantDetails).set(values).where(eq(restaurantDetails.listingId, listingId));
    else await db.insert(restaurantDetails).values({ listingId, ...values });
  } else if (d.type === "experience") {
    const values = {
      durationText: d.experienceDuration || null,
      groupSizeText: d.experienceGroupSize || null,
      whatsIncluded: d.experienceIncluded || null,
    };
    const [existing] = await db
      .select()
      .from(experienceDetails)
      .where(eq(experienceDetails.listingId, listingId))
      .limit(1);
    if (existing)
      await db.update(experienceDetails).set(values).where(eq(experienceDetails.listingId, listingId));
    else await db.insert(experienceDetails).values({ listingId, ...values });
  }

  revalidatePath("/admin/vendors");
  revalidatePath(`/admin/vendors/${d.vendorProfileId}`);
  revalidatePath("/journeys");

  return {};
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

  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/passport");
  revalidatePath("/dashboard/discounts");
  revalidatePath("/dashboard/bookings");
  revalidatePath("/vendor/dashboard/bookings");
  revalidatePath("/vendor/dashboard/referrals");
}
