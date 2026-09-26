import { and, count, desc, eq, gte, inArray, isNotNull, or } from "drizzle-orm";
import { db } from "@/db";
import type { DbOrTx } from "@/lib/db-context";
import { withRlsContext } from "@/lib/db-context";
import {
  bookings,
  events,
  experienceDetails,
  hotelDetails,
  journeys,
  listings,
  offers,
  restaurantDetails,
  rewards,
  travellerProfiles,
  userRewards,
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

/** Every listing this vendor owns, newest first — the vendor dashboard's
 * Listings page (a vendor can run more than one place/experience). */
export async function getVendorListings(vendorProfileId: string) {
  return db
    .select({ listing: listings, offer: offers })
    .from(listings)
    .leftJoin(offers, eq(offers.listingId, listings.id))
    .where(eq(listings.vendorProfileId, vendorProfileId))
    .orderBy(desc(listings.createdAt));
}

/** One of the vendor's own listings, with its full detail rows — used for
 * the vendor's own edit form. Returns null if the listing doesn't exist or
 * isn't theirs, so the caller can 404/redirect without a separate check. */
export async function getVendorOwnListingFull(vendorProfileId: string, listingId: string) {
  const [row] = await db
    .select({ listing: listings, offer: offers })
    .from(listings)
    .leftJoin(offers, eq(offers.listingId, listings.id))
    .where(and(eq(listings.id, listingId), eq(listings.vendorProfileId, vendorProfileId)))
    .limit(1);
  if (!row) return null;

  const [journeyTags, [hotel], [restaurant], [experience]] = await Promise.all([
    getJourneyTagsForListing(row.listing.id),
    db.select().from(hotelDetails).where(eq(hotelDetails.listingId, row.listing.id)).limit(1),
    db.select().from(restaurantDetails).where(eq(restaurantDetails.listingId, row.listing.id)).limit(1),
    db.select().from(experienceDetails).where(eq(experienceDetails.listingId, row.listing.id)).limit(1),
  ]);

  return { ...row, journeyTags, hotel: hotel ?? null, restaurant: restaurant ?? null, experience: experience ?? null };
}

// Columns for list/review views — excludes fileData (bytea) so rendering a
// list of documents doesn't pull every file's bytes into the query result.
export const vendorDocumentListColumns = {
  id: vendorDocuments.id,
  vendorProfileId: vendorDocuments.vendorProfileId,
  docType: vendorDocuments.docType,
  documentUrl: vendorDocuments.documentUrl,
  fileName: vendorDocuments.fileName,
  fileMimeType: vendorDocuments.fileMimeType,
  fileSize: vendorDocuments.fileSize,
  status: vendorDocuments.status,
  notes: vendorDocuments.notes,
  uploadedAt: vendorDocuments.uploadedAt,
  reviewedByUserId: vendorDocuments.reviewedByUserId,
  reviewedAt: vendorDocuments.reviewedAt,
} as const;

export async function getVendorDocuments(vendorProfileId: string, client: DbOrTx = db) {
  return client
    .select(vendorDocumentListColumns)
    .from(vendorDocuments)
    .where(eq(vendorDocuments.vendorProfileId, vendorProfileId))
    .orderBy(vendorDocuments.uploadedAt);
}

/** Fetches one document's actual bytes (or its external URL) for the
 * download/view route — the only place fileData should be selected. */
export async function getVendorDocumentFile(documentId: string, client: DbOrTx = db) {
  const [doc] = await client
    .select({
      id: vendorDocuments.id,
      vendorProfileId: vendorDocuments.vendorProfileId,
      documentUrl: vendorDocuments.documentUrl,
      fileName: vendorDocuments.fileName,
      fileMimeType: vendorDocuments.fileMimeType,
      fileData: vendorDocuments.fileData,
    })
    .from(vendorDocuments)
    .where(eq(vendorDocuments.id, documentId))
    .limit(1);
  return doc ?? null;
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

  const bookingRows = await withRlsContext({ role: "vendor", vendorProfileId }, (tx) =>
    tx
      .select({ status: bookings.status, estimatedCommission: bookings.estimatedCommission })
      .from(bookings)
      .where(inArray(bookings.listingId, listingIds)),
  );

  const confirmedRows = bookingRows.filter((b) => b.status === "confirmed" || b.status === "completed");
  const totalCommission = confirmedRows.reduce((sum, b) => sum + Number(b.estimatedCommission), 0);

  return {
    totalBookings: confirmedRows.length,
    totalCommission,
    totalViews,
    pendingCount: bookingRows.filter((b) => b.status === "pending").length,
  };
}

/** Lightweight count for the nav badge — how many requests are waiting on
 * this vendor's response right now. */
export async function getVendorPendingBookingsCount(vendorProfileId: string) {
  const vendorListings = await db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.vendorProfileId, vendorProfileId));
  const listingIds = vendorListings.map((l) => l.id);
  if (listingIds.length === 0) return 0;

  const row = await withRlsContext({ role: "vendor", vendorProfileId }, (tx) =>
    tx
      .select({ total: count() })
      .from(bookings)
      .where(and(inArray(bookings.listingId, listingIds), eq(bookings.status, "pending")))
      .then((rows) => rows[0]),
  );
  return row?.total ?? 0;
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

  return withRlsContext({ role: "vendor", vendorProfileId }, (tx) =>
    tx
      .select({
        booking: bookings,
        traveller: travellerProfiles,
        travellerUser: users,
        journey: journeys,
        listing: listings,
        appliedReward: rewards,
      })
      .from(bookings)
      .innerJoin(travellerProfiles, eq(bookings.travellerId, travellerProfiles.id))
      .innerJoin(users, eq(travellerProfiles.userId, users.id))
      .innerJoin(listings, eq(bookings.listingId, listings.id))
      .leftJoin(journeys, eq(bookings.journeyId, journeys.id))
      .leftJoin(userRewards, eq(bookings.appliedUserRewardId, userRewards.id))
      .leftJoin(rewards, eq(userRewards.rewardId, rewards.id))
      .where(inArray(bookings.listingId, listingIds))
      .orderBy(desc(bookings.createdAt)),
  );
}

/** Ticket purchases for events this vendor organizes — the event-ticket
 * counterpart to getVendorBookings, kept as a separate query rather than
 * folded into it since a booking has exactly one of listingId/eventId and
 * the two rarely need to render identically. */
export async function getVendorEventTicketBookings(vendorProfileId: string) {
  const vendorEvents = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.organizerVendorProfileId, vendorProfileId));

  const eventIds = vendorEvents.map((e) => e.id);
  if (eventIds.length === 0) return [];

  return withRlsContext({ role: "vendor", vendorProfileId }, (tx) =>
    tx
      .select({
        booking: bookings,
        traveller: travellerProfiles,
        travellerUser: users,
        event: events,
        appliedReward: rewards,
      })
      .from(bookings)
      .innerJoin(travellerProfiles, eq(bookings.travellerId, travellerProfiles.id))
      .innerJoin(users, eq(travellerProfiles.userId, users.id))
      .innerJoin(events, eq(bookings.eventId, events.id))
      .leftJoin(userRewards, eq(bookings.appliedUserRewardId, userRewards.id))
      .leftJoin(rewards, eq(userRewards.rewardId, rewards.id))
      .where(inArray(bookings.eventId, eventIds))
      .orderBy(desc(bookings.createdAt)),
  );
}

/** Today's ticket check-ins for this vendor — covers both a standalone
 * event they organize and their own "event"-type listing (ticket.QR check-
 * in isn't restricted to one or the other, see ticket-actions.ts). */
export async function getVendorTicketCheckInsToday(vendorProfileId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const rows = await withRlsContext({ role: "vendor", vendorProfileId }, (tx) =>
    tx
      .select({ booking: bookings, listing: listings, event: events, traveller: travellerProfiles })
      .from(bookings)
      .leftJoin(listings, eq(listings.id, bookings.listingId))
      .leftJoin(events, eq(events.id, bookings.eventId))
      .innerJoin(travellerProfiles, eq(travellerProfiles.id, bookings.travellerId))
      .where(
        and(
          isNotNull(bookings.checkedInAt),
          gte(bookings.checkedInAt, startOfDay),
          or(eq(listings.vendorProfileId, vendorProfileId), eq(events.organizerVendorProfileId, vendorProfileId)),
        ),
      )
      .orderBy(desc(bookings.checkedInAt)),
  );

  return rows;
}
