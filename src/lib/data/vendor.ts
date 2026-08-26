import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  bookings,
  experienceDetails,
  hotelDetails,
  journeys,
  listings,
  offers,
  restaurantDetails,
  travellerProfiles,
  users,
  vendorDocuments,
  vendorProfiles,
} from "@/db/schema";
import { getJourneyTagsForListing } from "./journeys";

export async function getVendorProfileByUserId(userId: string) {
  const [profile] = await db
    .select()
    .from(vendorProfiles)
    .where(eq(vendorProfiles.userId, userId))
    .limit(1);
  return profile ?? null;
}

export async function getVendorProfileById(id: string) {
  const [profile] = await db.select().from(vendorProfiles).where(eq(vendorProfiles.id, id)).limit(1);
  return profile ?? null;
}

export async function getVendorListingWithOffer(vendorProfileId: string) {
  const [row] = await db
    .select({ listing: listings, offer: offers })
    .from(listings)
    .leftJoin(offers, eq(offers.listingId, listings.id))
    .where(eq(listings.vendorProfileId, vendorProfileId))
    .limit(1);
  return row ?? null;
}

/** Listing plus its journey tags and type-specific detail row, for the
 * vendor's own preview and the admin onboarding/edit form. */
export async function getVendorListingFull(vendorProfileId: string) {
  const row = await getVendorListingWithOffer(vendorProfileId);
  if (!row) return null;

  const [journeyTags, [hotel], [restaurant], [experience]] = await Promise.all([
    getJourneyTagsForListing(row.listing.id),
    db.select().from(hotelDetails).where(eq(hotelDetails.listingId, row.listing.id)).limit(1),
    db
      .select()
      .from(restaurantDetails)
      .where(eq(restaurantDetails.listingId, row.listing.id))
      .limit(1),
    db
      .select()
      .from(experienceDetails)
      .where(eq(experienceDetails.listingId, row.listing.id))
      .limit(1),
  ]);

  return { ...row, journeyTags, hotel: hotel ?? null, restaurant: restaurant ?? null, experience: experience ?? null };
}

export async function getVendorDocuments(vendorProfileId: string) {
  return db
    .select()
    .from(vendorDocuments)
    .where(eq(vendorDocuments.vendorProfileId, vendorProfileId))
    .orderBy(vendorDocuments.uploadedAt);
}

export async function getVendorReferralStats(vendorProfileId: string) {
  const vendorListings = await db
    .select({ id: listings.id, viewCount: listings.viewCount })
    .from(listings)
    .where(eq(listings.vendorProfileId, vendorProfileId));

  const listingIds = vendorListings.map((l) => l.id);
  const totalViews = vendorListings.reduce((sum, l) => sum + l.viewCount, 0);

  if (listingIds.length === 0) {
    return { totalBookings: 0, totalCommission: 0, totalViews, pendingCount: 0 };
  }

  const bookingRows = await db
    .select({ status: bookings.status, estimatedCommission: bookings.estimatedCommission })
    .from(bookings)
    .where(inArray(bookings.listingId, listingIds));

  const confirmedRows = bookingRows.filter((b) => b.status === "confirmed" || b.status === "completed");
  const totalCommission = confirmedRows.reduce((sum, b) => sum + Number(b.estimatedCommission), 0);

  return {
    totalBookings: confirmedRows.length,
    totalCommission,
    totalViews,
    pendingCount: bookingRows.filter((b) => b.status === "pending").length,
  };
}

/** All booking requests for a vendor's listing(s), newest first — used on
 * the vendor's Bookings page to confirm/decline pending requests. */
export async function getVendorBookings(vendorProfileId: string) {
  const vendorListings = await db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.vendorProfileId, vendorProfileId));

  const listingIds = vendorListings.map((l) => l.id);
  if (listingIds.length === 0) return [];

  return db
    .select({
      booking: bookings,
      traveller: travellerProfiles,
      travellerUser: users,
      journey: journeys,
      listing: listings,
    })
    .from(bookings)
    .innerJoin(travellerProfiles, eq(bookings.travellerId, travellerProfiles.id))
    .innerJoin(users, eq(travellerProfiles.userId, users.id))
    .innerJoin(listings, eq(bookings.listingId, listings.id))
    .leftJoin(journeys, eq(bookings.journeyId, journeys.id))
    .where(inArray(bookings.listingId, listingIds))
    .orderBy(desc(bookings.createdAt));
}
