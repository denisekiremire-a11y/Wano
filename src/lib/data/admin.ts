import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accreditationReviews,
  bookings,
  challengeCompletions,
  journeys,
  listingJourneys,
  listings,
  promoCodes,
  stamps,
  travellerProfiles,
  users,
  vendorDocuments,
  vendorProfiles,
} from "@/db/schema";
import { getJourneyTagsForListing } from "./journeys";
import {
  getVendorListingFull,
  getVendorListingWithOffer,
  getVendorProfileById,
  vendorDocumentListColumns,
} from "./vendor";

export async function getVendorDetail(vendorProfileId: string) {
  const vendorProfile = await getVendorProfileById(vendorProfileId);
  if (!vendorProfile) return null;

  const [vendorUser] = await db.select().from(users).where(eq(users.id, vendorProfile.userId)).limit(1);

  const [listingRow, documents, reviews, allJourneys] = await Promise.all([
    getVendorListingFull(vendorProfileId),
    db
      .select(vendorDocumentListColumns)
      .from(vendorDocuments)
      .where(eq(vendorDocuments.vendorProfileId, vendorProfileId))
      .orderBy(desc(vendorDocuments.uploadedAt)),
    db
      .select({ review: accreditationReviews, reviewer: users })
      .from(accreditationReviews)
      .innerJoin(users, eq(accreditationReviews.reviewerUserId, users.id))
      .where(eq(accreditationReviews.vendorProfileId, vendorProfileId))
      .orderBy(desc(accreditationReviews.decidedAt)),
    db.select().from(journeys).orderBy(journeys.sortOrder),
  ]);

  return { vendorProfile, vendorUser, listingRow, documents, reviews, allJourneys };
}

export async function getVendorApprovalQueue() {
  const rows = await db
    .select({ vendor: vendorProfiles, user: users })
    .from(vendorProfiles)
    .innerJoin(users, eq(vendorProfiles.userId, users.id))
    .orderBy(vendorProfiles.createdAt);

  return Promise.all(
    rows.map(async (row) => {
      const [listingRow, pendingDocs] = await Promise.all([
        getVendorListingWithOffer(row.vendor.id),
        db
          .select(vendorDocumentListColumns)
          .from(vendorDocuments)
          .where(eq(vendorDocuments.vendorProfileId, row.vendor.id)),
      ]);

      const journeyTags = listingRow ? await getJourneyTagsForListing(listingRow.listing.id) : [];

      return {
        ...row,
        listing: listingRow?.listing ?? null,
        journeyTags,
        pendingDocCount: pendingDocs.filter((doc) => doc.status === "pending").length,
        totalDocCount: pendingDocs.length,
      };
    }),
  );
}

export async function getAllBookings() {
  return db
    .select({
      booking: bookings,
      traveller: travellerProfiles,
      travellerUser: users,
      listing: listings,
      vendor: vendorProfiles,
      journey: journeys,
    })
    .from(bookings)
    .innerJoin(travellerProfiles, eq(bookings.travellerId, travellerProfiles.id))
    .innerJoin(users, eq(travellerProfiles.userId, users.id))
    .innerJoin(listings, eq(bookings.listingId, listings.id))
    .innerJoin(vendorProfiles, eq(listings.vendorProfileId, vendorProfiles.id))
    .leftJoin(journeys, eq(bookings.journeyId, journeys.id))
    .orderBy(desc(bookings.createdAt));
}

export async function getAllTravellersWithProgress() {
  const journeyList = await db.select().from(journeys).orderBy(journeys.sortOrder);
  const totalJourneys = journeyList.length;

  const rows = await db
    .select({ traveller: travellerProfiles, user: users })
    .from(travellerProfiles)
    .innerJoin(users, eq(travellerProfiles.userId, users.id))
    .orderBy(desc(travellerProfiles.createdAt));

  const allStamps = await db.select().from(stamps);
  const allCompletions = await db
    .select()
    .from(challengeCompletions)
    .where(eq(challengeCompletions.status, "verified"));
  const allBookings = await db.select().from(bookings);

  return rows.map((row) => {
    const stampCount = new Set(
      allStamps.filter((s) => s.travellerId === row.traveller.id).map((s) => s.journeyId),
    ).size;
    return {
      ...row,
      stampCount,
      totalJourneys,
      grandPrizeQualified: stampCount >= totalJourneys,
      challengeCount: allCompletions.filter((c) => c.travellerId === row.traveller.id).length,
      bookingCount: allBookings.filter((b) => b.travellerId === row.traveller.id).length,
    };
  });
}

export async function getAllPromoCodes() {
  return db
    .select({ promo: promoCodes, journey: journeys, listing: listings, vendor: vendorProfiles })
    .from(promoCodes)
    .leftJoin(journeys, eq(promoCodes.journeyId, journeys.id))
    .leftJoin(listings, eq(promoCodes.listingId, listings.id))
    .leftJoin(vendorProfiles, eq(listings.vendorProfileId, vendorProfiles.id))
    .orderBy(desc(promoCodes.createdAt));
}

/** All active listings for the admin promo-scope picker, labeled with their
 * business name so admins can find a specific place. */
export async function getAllListingsForAdmin() {
  return db
    .select({ listing: listings, vendor: vendorProfiles })
    .from(listings)
    .innerJoin(vendorProfiles, eq(listings.vendorProfileId, vendorProfiles.id))
    .orderBy(vendorProfiles.businessName);
}

export async function getAllVendorProfilesForAdmin() {
  return db
    .select({ id: vendorProfiles.id, businessName: vendorProfiles.businessName })
    .from(vendorProfiles)
    .orderBy(vendorProfiles.businessName);
}

export async function getCampaignMetrics() {
  const journeyList = await db.select().from(journeys).orderBy(journeys.sortOrder);
  const allVendors = await db.select().from(vendorProfiles);
  const allBookings = await db.select().from(bookings);
  const allStamps = await db.select().from(stamps);
  const allTravellers = await db.select().from(travellerProfiles);
  const allCompletions = await db.select().from(challengeCompletions);

  const journeyListingRows = await db
    .select({
      journeyId: listingJourneys.journeyId,
      accreditationStatus: vendorProfiles.accreditationStatus,
    })
    .from(listingJourneys)
    .innerJoin(listings, eq(listingJourneys.listingId, listings.id))
    .innerJoin(vendorProfiles, eq(listings.vendorProfileId, vendorProfiles.id));

  const partnersPerJourney = journeyList.map((journey) => {
    const rowsForJourney = journeyListingRows.filter((r) => r.journeyId === journey.id);
    return {
      journey,
      trusted: rowsForJourney.filter((r) => r.accreditationStatus === "trusted").length,
      pending: rowsForJourney.filter((r) => r.accreditationStatus === "pending").length,
      bookings: allBookings.filter((b) => b.journeyId === journey.id).length,
    };
  });

  const stampsByTraveller = new Map<string, Set<string>>();
  for (const stamp of allStamps) {
    const set = stampsByTraveller.get(stamp.travellerId) ?? new Set<string>();
    set.add(stamp.journeyId);
    stampsByTraveller.set(stamp.travellerId, set);
  }
  const passportCompletions = Array.from(stampsByTraveller.values()).filter(
    (set) => set.size >= journeyList.length,
  ).length;

  return {
    totalPartners: allVendors.filter((v) => v.accreditationStatus === "trusted").length,
    pendingPartners: allVendors.filter((v) => v.accreditationStatus === "pending").length,
    totalBookings: allBookings.length,
    totalTravellers: allTravellers.length,
    passportCompletions,
    challengesCompleted: allCompletions.filter((c) => c.status === "verified").length,
    partnersPerJourney,
  };
}

/** Candidates for "club host" — any named, real Wano account. */
export async function getHostCandidates() {
  return db.select({ id: users.id, name: users.name, role: users.role }).from(users).orderBy(users.name);
}
