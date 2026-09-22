import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { journeys, listings, vendorProfiles } from "@/db/schema";
import { listingPublishConditions } from "@/lib/listing-publish";

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export type TrendingListing = {
  listing: typeof listings.$inferSelect;
  vendor: typeof vendorProfiles.$inferSelect;
  latitude: number | null;
  longitude: number | null;
};

/** Top listings by view count — the closest real signal to "trending" this
 * app tracks today (no saves/bookings-based ranking exists yet). Same
 * trusted+published gate as `searchListings`. */
export async function getTrendingListings(limit = 24): Promise<TrendingListing[]> {
  const rows = await db
    .select({ listing: listings, vendor: vendorProfiles })
    .from(listings)
    .innerJoin(vendorProfiles, eq(listings.vendorProfileId, vendorProfiles.id))
    .where(and(eq(vendorProfiles.accreditationStatus, "trusted"), ...listingPublishConditions))
    .orderBy(desc(listings.viewCount))
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    latitude: toNumber(r.listing.latitude),
    longitude: toNumber(r.listing.longitude),
  }));
}

/** Featured journeys first, then by view count — journeys don't carry
 * lat/lng (they're a themed bundle of listings, not one place), so these
 * never appear on the map, only in the Trending card grid. No status
 * filter: unlike journal posts, `journeys.status` isn't used as a live
 * publish gate anywhere else in the app (see `getJourneys()`, used
 * unfiltered on the homepage) — filtering here would just hide every
 * journey in this dataset (all seeded as "draft") while every other page
 * shows them. */
export async function getTrendingJourneys(limit = 6) {
  return db
    .select()
    .from(journeys)
    .orderBy(desc(journeys.isFeatured), desc(journeys.viewCount))
    .limit(limit);
}
