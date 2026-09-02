import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import {
  events,
  experienceDetails,
  hotelDetails,
  journeys,
  journeyStops,
  listingJourneys,
  listings,
  offers,
  promoCodes,
  restaurantDetails,
  savedListings,
  supplyLeads,
  travellerProfiles,
  users,
  vendorProfiles,
} from "@/db/schema";
import { listingPublishConditions } from "@/lib/listing-publish";
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
        eq(vendorProfiles.accreditationStatus, "trusted"),
        ...listingPublishConditions,
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
  const conditions = [eq(vendorProfiles.accreditationStatus, "trusted"), ...listingPublishConditions];

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

/** Day-by-day itinerary for a journey's detail page, with the listing/event
 * a stop books joined in. A custom stop (no listingId/eventId) renders
 * information-only from customName/customAddress. */
export async function getJourneyStops(journeyId: string) {
  const rows = await db
    .select({ stop: journeyStops, listing: listings, event: events })
    .from(journeyStops)
    .leftJoin(listings, eq(listings.id, journeyStops.listingId))
    .leftJoin(events, eq(events.id, journeyStops.eventId))
    .where(eq(journeyStops.journeyId, journeyId))
    .orderBy(journeyStops.dayNumber, journeyStops.orderIndex);
  return rows;
}

/** "Featured in these journeys" on a listing's detail page — published
 * journeys that actually route to this exact listing via a real stop, not
 * just the looser theme tag (listingJourneys). */
export async function getJourneysFeaturingListing(listingId: string) {
  const rows = await db
    .selectDistinct({ journey: journeys })
    .from(journeyStops)
    .innerJoin(journeys, eq(journeys.id, journeyStops.journeyId))
    .where(and(eq(journeyStops.listingId, listingId), eq(journeys.status, "published")));
  return rows.map((r) => r.journey);
}

/** Every journey for the admin list, with a stop count so incomplete ones
 * (no stops yet, no cost range) are obvious at a glance. */
export async function getAllJourneysForAdmin() {
  const [rows, stopCounts] = await Promise.all([
    db.select().from(journeys).orderBy(journeys.sortOrder, journeys.slug),
    db.select({ journeyId: journeyStops.journeyId, total: count() }).from(journeyStops).groupBy(journeyStops.journeyId),
  ]);
  const countMap = new Map(stopCounts.map((r) => [r.journeyId, r.total]));
  return rows.map((journey) => ({ journey, stopCount: countMap.get(journey.id) ?? 0 }));
}

export async function getJourneyStopById(stopId: string) {
  const [row] = await db.select().from(journeyStops).where(eq(journeyStops.id, stopId)).limit(1);
  return row ?? null;
}

/** The ops queue — real places referenced in a journey that aren't on Wano
 * yet, grouped with enough context (journey + stop) to actually chase. */
export async function getSupplyLeads(statusFilter?: "open" | "contacted" | "listed" | "dismissed") {
  const rows = await db
    .select({ lead: supplyLeads, stop: journeyStops, journey: journeys })
    .from(supplyLeads)
    .innerJoin(journeyStops, eq(journeyStops.id, supplyLeads.journeyStopId))
    .innerJoin(journeys, eq(journeys.id, journeyStops.journeyId))
    .where(statusFilter ? eq(supplyLeads.status, statusFilter) : undefined)
    .orderBy(desc(supplyLeads.createdAt));
  return rows;
}

/** Active listings for the admin stop-picker dropdown. */
export async function getListingOptions() {
  const rows = await db
    .select({ id: listings.id, title: listings.title, vendorName: vendorProfiles.businessName })
    .from(listings)
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, listings.vendorProfileId))
    .where(eq(listings.active, true))
    .orderBy(listings.title);
  return rows;
}

/** Guard used before publishing — "what does this cost" must be answered. */
export function journeyHasCostRange(journey: { estCostMinMinor: number | null; estCostMaxMinor: number | null }) {
  return journey.estCostMinMinor != null && journey.estCostMaxMinor != null;
}
