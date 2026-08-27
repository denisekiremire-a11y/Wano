import { and, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import {
  experienceDetails,
  hotelDetails,
  journeys,
  listingJourneys,
  listings,
  offers,
  promoCodes,
  restaurantDetails,
  savedListings,
  travellerProfiles,
  users,
  vendorProfiles,
} from "@/db/schema";
import type { ListingType } from "@/lib/listing-type";

export async function getJourneys() {
  return db.select().from(journeys).orderBy(journeys.sortOrder);
}

export async function getJourneyBySlug(slug: string) {
  const [journey] = await db.select().from(journeys).where(eq(journeys.slug, slug)).limit(1);
  return journey ?? null;
}

export async function getJourneyById(id: string) {
  const [journey] = await db.select().from(journeys).where(eq(journeys.id, id)).limit(1);
  return journey ?? null;
}

export async function getPublicListingsForJourney(journeyId: string) {
  const rows = await db
    .select({
      listing: listings,
      offer: offers,
      vendor: vendorProfiles,
      promo: promoCodes,
    })
    .from(listingJourneys)
    .innerJoin(listings, eq(listingJourneys.listingId, listings.id))
    .innerJoin(vendorProfiles, eq(listings.vendorProfileId, vendorProfiles.id))
    .leftJoin(offers, eq(offers.listingId, listings.id))
    .leftJoin(
      promoCodes,
      and(eq(promoCodes.listingId, listings.id), eq(promoCodes.active, true)),
    )
    .where(
      and(
        eq(listingJourneys.journeyId, journeyId),
        eq(listings.active, true),
        eq(vendorProfiles.accreditationStatus, "trusted"),
      ),
    );

  return rows;
}

export async function getAllPublicListings() {
  const journeyList = await getJourneys();
  const listingsByJourney = await Promise.all(
    journeyList.map(async (journey) => ({
      journey,
      partners: await getPublicListingsForJourney(journey.id),
    })),
  );
  return listingsByJourney;
}

export type ListingSearchFilters = {
  type?: ListingType;
  location?: string;
  query?: string;
};

/** Every trusted, active listing regardless of journey tag — the broader
 * discovery catalog (hotels/restaurants/experiences/transport near you),
 * still gated to the same accredited-partner network. Supports optional
 * type/location/text filters for the "browse all partners" explore view. */
export async function searchListings(filters: ListingSearchFilters = {}) {
  const conditions = [eq(listings.active, true), eq(vendorProfiles.accreditationStatus, "trusted")];

  if (filters.type) conditions.push(eq(listings.type, filters.type));
  if (filters.location) conditions.push(eq(vendorProfiles.location, filters.location));
  if (filters.query) {
    const q = `%${filters.query}%`;
    conditions.push(
      or(
        ilike(listings.title, q),
        ilike(listings.description, q),
        ilike(vendorProfiles.businessName, q),
        ilike(vendorProfiles.location, q),
      )!,
    );
  }

  return db
    .select({ listing: listings, offer: offers, vendor: vendorProfiles, promo: promoCodes })
    .from(listings)
    .innerJoin(vendorProfiles, eq(listings.vendorProfileId, vendorProfiles.id))
    .leftJoin(offers, eq(offers.listingId, listings.id))
    .leftJoin(
      promoCodes,
      and(eq(promoCodes.listingId, listings.id), eq(promoCodes.active, true)),
    )
    .where(and(...conditions));
}

/** A single listing (with offer/vendor/promo) for the detail page — not
 * gated to trusted/active, so an admin link still resolves; the page itself
 * decides what to show for an inactive/unaccredited listing. */
export async function getListingById(listingId: string) {
  const [row] = await db
    .select({ listing: listings, offer: offers, vendor: vendorProfiles, promo: promoCodes })
    .from(listings)
    .innerJoin(vendorProfiles, eq(listings.vendorProfileId, vendorProfiles.id))
    .leftJoin(offers, eq(offers.listingId, listings.id))
    .leftJoin(promoCodes, and(eq(promoCodes.listingId, listings.id), eq(promoCodes.active, true)))
    .where(eq(listings.id, listingId))
    .limit(1);
  return row ?? null;
}

/** Travellers who've saved a listing — the "people interested" list on its
 * detail page (there's no RSVP concept for a place the way events have one). */
export async function getInterestedTravellers(listingId: string) {
  return db
    .select({ traveller: travellerProfiles, user: users })
    .from(savedListings)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, savedListings.travellerId))
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(eq(savedListings.listingId, listingId))
    .orderBy(savedListings.createdAt);
}

/** Type-specific "what's on offer" for the listing detail page — room types
 * & amenities for a hotel, cuisine & hours for a restaurant, duration &
 * what's included for an experience. Transport/spa_salon have no dedicated
 * detail table yet, so this returns all-null for those (the page falls back
 * to the listing's own description/priceHint). */
export async function getListingTypeDetails(listingId: string) {
  const [[hotel], [restaurant], [experience]] = await Promise.all([
    db.select().from(hotelDetails).where(eq(hotelDetails.listingId, listingId)).limit(1),
    db.select().from(restaurantDetails).where(eq(restaurantDetails.listingId, listingId)).limit(1),
    db.select().from(experienceDetails).where(eq(experienceDetails.listingId, listingId)).limit(1),
  ]);
  return { hotel: hotel ?? null, restaurant: restaurant ?? null, experience: experience ?? null };
}

export async function getDistinctListingLocations() {
  const rows = await db
    .selectDistinct({ location: vendorProfiles.location })
    .from(vendorProfiles)
    .innerJoin(listings, eq(listings.vendorProfileId, vendorProfiles.id))
    .where(and(eq(listings.active, true), eq(vendorProfiles.accreditationStatus, "trusted")));

  return rows.map((r) => r.location).sort();
}

export async function getJourneyTagsForListing(listingId: string) {
  const rows = await db
    .select({ journey: journeys })
    .from(listingJourneys)
    .innerJoin(journeys, eq(listingJourneys.journeyId, journeys.id))
    .where(eq(listingJourneys.listingId, listingId));
  return rows.map((r) => r.journey);
}

/** Bulk version of getJourneyTagsForListing for a set of listings (avoids
 * N+1 queries when rendering a grid). */
export async function getJourneyTagsForListings(listingIds: string[]) {
  const map = new Map<string, (typeof journeys.$inferSelect)[]>();
  if (listingIds.length === 0) return map;

  const rows = await db
    .select({ listingId: listingJourneys.listingId, journey: journeys })
    .from(listingJourneys)
    .innerJoin(journeys, eq(listingJourneys.journeyId, journeys.id));

  for (const row of rows) {
    if (!listingIds.includes(row.listingId)) continue;
    const existing = map.get(row.listingId) ?? [];
    existing.push(row.journey);
    map.set(row.listingId, existing);
  }
  return map;
}
