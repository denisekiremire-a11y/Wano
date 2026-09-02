import { eq, sql, type SQL } from "drizzle-orm";
import { listings, vendorProfiles } from "@/db/schema";

/** The conditions gating whether a listing renders in any public feed or
 * grid — fails closed. Requires the query to already join vendorProfiles
 * (every call site does, for accreditation/location). Real-content checks
 * (non-empty description, a set price, a non-empty vendor location) exist
 * so an incomplete listing never shows a "placeholder" card; isPublished is
 * the explicit admin-level override for a listing that's otherwise complete
 * but not ready (see supply leads, Milestone J).
 *
 * Photo enforcement is deliberately not included here — listings have no
 * image field yet (no upload pipeline exists), so requiring one would empty
 * every grid, including the fully real listings. Add it here once listings
 * can actually carry a photo. */
export const listingPublishConditions: SQL[] = [
  eq(listings.active, true),
  eq(listings.isPublished, true),
  sql`btrim(${listings.description}) <> ''`,
  sql`${listings.priceMinor} is not null`,
  sql`btrim(${vendorProfiles.location}) <> ''`,
];
