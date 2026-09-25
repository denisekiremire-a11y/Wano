import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { listings, slots, vendorProfiles } from "@/db/schema";

// Only ever shows today-or-later slots — a listing's slot manager doesn't
// need to scroll through months of past history to find what's coming up.
export async function getListingSlots(listingId: string) {
  const today = new Date().toISOString().slice(0, 10);
  return db
    .select()
    .from(slots)
    .where(and(eq(slots.listingId, listingId), gte(slots.date, today)))
    .orderBy(asc(slots.date), asc(slots.startTime));
}

// Admin's cross-vendor view — every upcoming slot, with enough listing/
// vendor context to manage any of them from one page.
export async function getAllUpcomingSlots() {
  const today = new Date().toISOString().slice(0, 10);
  return db
    .select({ slot: slots, listingTitle: listings.title, vendorBusinessName: vendorProfiles.businessName })
    .from(slots)
    .innerJoin(listings, eq(listings.id, slots.listingId))
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, slots.vendorId))
    .where(gte(slots.date, today))
    .orderBy(asc(slots.date), asc(slots.startTime));
}
