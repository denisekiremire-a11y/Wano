import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  experienceDetails,
  hotelDetails,
  listingJourneys,
  listings,
  offers,
  restaurantDetails,
  vendorProfiles,
} from "@/db/schema";
import { generatePlaceAddedItem } from "@/lib/feed-generators";

// Shared by the admin's direct-edit form (applies immediately) and the
// vendor-submission approval flow (applies once an admin approves the
// vendor's proposed payload) — same field set either way, so both paths
// stay in sync instead of drifting apart.
export const listingContentSchema = z.object({
  type: z.enum(["hotel", "restaurant", "experience", "transport", "spa_salon"]),
  title: z.string().min(2).max(150),
  description: z.string().min(10).max(1000),
  priceLabel: z.string().max(30).optional().or(z.literal("")),
  priceMinor: z.coerce.number().int().min(0),
  currency: z.string().min(1).max(10).optional().or(z.literal("")),
  priceUnit: z.string().max(20).optional().or(z.literal("")),
  externalBookingUrl: z.string().url().max(300).optional().or(z.literal("")),
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

export type ListingContent = z.infer<typeof listingContentSchema>;

export function parseListingContentFromFormData(formData: FormData) {
  return listingContentSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description"),
    priceLabel: formData.get("priceLabel") ?? "",
    priceMinor: formData.get("priceMinor"),
    currency: formData.get("currency") ?? "",
    priceUnit: formData.get("priceUnit") ?? "",
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
}

/** Creates or updates a listing (plus its journey tags, offer, and
 * type-specific detail row) from approved content. Returns the listing id.
 * Never touches isPublished/active — those are the platform gate and the
 * vendor's own pause switch respectively, orthogonal to content moderation. */
export async function applyListingContent(
  listingId: string | null,
  vendorProfileId: string,
  d: ListingContent,
): Promise<string> {
  const listingValues = {
    vendorProfileId,
    type: d.type,
    title: d.title,
    description: d.description,
    priceLabel: d.priceLabel || "From",
    priceMinor: d.priceMinor,
    currency: d.currency || "UGX",
    priceUnit: d.priceUnit || null,
    externalBookingUrl: d.externalBookingUrl || null,
    latitude: d.latitude === "" || d.latitude === undefined ? null : String(d.latitude),
    longitude: d.longitude === "" || d.longitude === undefined ? null : String(d.longitude),
  };

  let id = listingId;
  if (id) {
    await db.update(listings).set(listingValues).where(eq(listings.id, id));
  } else {
    const [created] = await db.insert(listings).values(listingValues).returning();
    id = created.id;
    // No-ops if the vendor isn't trusted yet — setAccreditationStatusAction
    // backfills this listing once they are.
    await generatePlaceAddedItem(id);
  }

  await db.delete(listingJourneys).where(eq(listingJourneys.listingId, id));
  if (d.journeyIds.length > 0) {
    await db.insert(listingJourneys).values(d.journeyIds.map((journeyId) => ({ listingId: id!, journeyId })));
  }

  const [existingOffer] = await db.select().from(offers).where(eq(offers.listingId, id)).limit(1);
  if (existingOffer) {
    await db
      .update(offers)
      .set({ discountText: d.discountText, freebieText: d.freebieText || null, updatedAt: new Date() })
      .where(eq(offers.listingId, id));
  } else {
    await db.insert(offers).values({ listingId: id, discountText: d.discountText, freebieText: d.freebieText || null });
  }

  if (d.type === "hotel") {
    const values = {
      roomTypes: d.hotelRoomTypes || null,
      amenities: d.hotelAmenities || null,
      checkInTime: d.hotelCheckIn || null,
      checkOutTime: d.hotelCheckOut || null,
    };
    const [existing] = await db.select().from(hotelDetails).where(eq(hotelDetails.listingId, id)).limit(1);
    if (existing) await db.update(hotelDetails).set(values).where(eq(hotelDetails.listingId, id));
    else await db.insert(hotelDetails).values({ listingId: id, ...values });
  } else if (d.type === "restaurant") {
    const values = {
      cuisine: d.restaurantCuisine || null,
      priceRange: d.restaurantPriceRange || null,
      hours: d.restaurantHours || null,
    };
    const [existing] = await db.select().from(restaurantDetails).where(eq(restaurantDetails.listingId, id)).limit(1);
    if (existing) await db.update(restaurantDetails).set(values).where(eq(restaurantDetails.listingId, id));
    else await db.insert(restaurantDetails).values({ listingId: id, ...values });
  } else if (d.type === "experience") {
    const values = {
      durationText: d.experienceDuration || null,
      groupSizeText: d.experienceGroupSize || null,
      whatsIncluded: d.experienceIncluded || null,
    };
    const [existing] = await db.select().from(experienceDetails).where(eq(experienceDetails.listingId, id)).limit(1);
    if (existing) await db.update(experienceDetails).set(values).where(eq(experienceDetails.listingId, id));
    else await db.insert(experienceDetails).values({ listingId: id, ...values });
  }

  return id;
}

/** The vendor's own social links live on vendorProfiles, not the listing —
 * bundled into the same submission payload as a convenience since the
 * vendor-facing form edits them together, but applied separately. */
export async function applyVendorSocialLinks(vendorProfileId: string, d: ListingContent) {
  await db
    .update(vendorProfiles)
    .set({
      instagramUrl: d.instagramUrl || null,
      facebookUrl: d.facebookUrl || null,
      tiktokUrl: d.tiktokUrl || null,
      websiteUrl: d.websiteUrl || null,
    })
    .where(eq(vendorProfiles.id, vendorProfileId));
}
