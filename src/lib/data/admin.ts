import { and, count, desc, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  accreditationReviews,
  adminActionLog,
  bookings,
  challengeCompletions,
  events,
  follows,
  journeys,
  listingJourneys,
  listings,
  posts as postsTable,
  promoCodes,
  rewards,
  stamps,
  travellerProfiles,
  userRewards,
  users,
  vendorDocuments,
  vendorProfiles,
} from "@/db/schema";
import type { DbOrTx } from "@/lib/db-context";
import { withRlsContext } from "@/lib/db-context";
import { calculatePostEarningsMinor, isInfluencerByFollowers, MONETIZABLE_POST_LIKE_THRESHOLD } from "@/lib/influencer";
import { getEngagementCounts } from "./social";
import { getJourneyTagsForListing } from "./journeys";
import {
  getVendorListingFull,
  getVendorListingWithOffer,
  getVendorProfileById,
  vendorDocumentListColumns,
} from "./vendor";

export type DashboardMetrics = {
  commissionAllTime: number;
  commissionLast7: number;
  commissionPrev7: number;
  commissionLast30: number;
  commissionPrev30: number;
  funnel: { won: number; pending: number; lost: number };
  /** Oldest-first, one entry per calendar day (UTC), zero-filled — the last
   * 30 days regardless of whether a given day had any bookings at all. */
  dailyBookings: { date: string; count: number }[];
  topVendors: { vendorProfileId: string; businessName: string; commission: number }[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WON_STATUSES = new Set(["confirmed", "completed"]);
const LOST_STATUSES = new Set(["cancelled", "expired"]);

/** Stage 2's actual business metrics — commission earned, the booking
 * funnel, a 30-day trend, and who's driving revenue — none of which
 * getCampaignMetrics (a pure headcount tally) surfaces. Fetches full rows
 * and reduces in JS, same style as getCampaignMetrics/
 * getAllTravellersWithProgress below: booking volume here is small enough
 * that a SQL aggregation buys nothing but a second query shape to maintain.
 * Vendor attribution only follows the listing-booking path (bookings ->
 * listings -> vendorProfiles) — event-ticket bookings have no listing row
 * to join through and are a small minority of the estimatedCommission
 * total, so they're included in every total above but not attributed to
 * a specific vendor in the leaderboard. */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const { rows, vendorRows } = await withRlsContext({ role: "admin" }, async (tx) => {
    const rows = await tx
      .select({
        status: bookings.status,
        commission: bookings.estimatedCommission,
        createdAt: bookings.createdAt,
        listingId: bookings.listingId,
      })
      .from(bookings);
    const vendorRows = await tx
      .select({ listingId: listings.id, vendorProfileId: listings.vendorProfileId, businessName: vendorProfiles.businessName })
      .from(listings)
      .innerJoin(vendorProfiles, eq(vendorProfiles.id, listings.vendorProfileId));
    return { rows, vendorRows };
  });
  const vendorByListing = new Map(vendorRows.map((v) => [v.listingId, v]));

  const now = Date.now();
  const dailyCounts = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    dailyCounts.set(new Date(now - i * DAY_MS).toISOString().slice(0, 10), 0);
  }

  let commissionAllTime = 0;
  let commissionLast7 = 0;
  let commissionPrev7 = 0;
  let commissionLast30 = 0;
  let commissionPrev30 = 0;
  let won = 0;
  let lost = 0;
  let pending = 0;
  const vendorCommission = new Map<string, { businessName: string; commission: number }>();

  for (const row of rows) {
    const isWon = WON_STATUSES.has(row.status);
    if (isWon) won++;
    else if (LOST_STATUSES.has(row.status)) lost++;
    else pending++;

    const ageMs = now - row.createdAt.getTime();
    if (isWon) {
      const commission = Number(row.commission);
      commissionAllTime += commission;
      if (ageMs <= 7 * DAY_MS) commissionLast7 += commission;
      else if (ageMs <= 14 * DAY_MS) commissionPrev7 += commission;
      if (ageMs <= 30 * DAY_MS) commissionLast30 += commission;
      else if (ageMs <= 60 * DAY_MS) commissionPrev30 += commission;

      const vendor = row.listingId ? vendorByListing.get(row.listingId) : undefined;
      if (vendor) {
        const entry = vendorCommission.get(vendor.vendorProfileId) ?? { businessName: vendor.businessName, commission: 0 };
        entry.commission += commission;
        vendorCommission.set(vendor.vendorProfileId, entry);
      }
    }

    if (ageMs >= 0 && ageMs < 30 * DAY_MS) {
      const key = row.createdAt.toISOString().slice(0, 10);
      if (dailyCounts.has(key)) dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
    }
  }

  const dailyBookings = [...dailyCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayCount]) => ({ date, count: dayCount }));
  const topVendors = [...vendorCommission.entries()]
    .map(([vendorProfileId, v]) => ({ vendorProfileId, businessName: v.businessName, commission: v.commission }))
    .sort((a, b) => b.commission - a.commission)
    .slice(0, 5);

  return {
    commissionAllTime,
    commissionLast7,
    commissionPrev7,
    commissionLast30,
    commissionPrev30,
    funnel: { won, pending, lost },
    dailyBookings,
    topVendors,
  };
}

/** Most recent entries in the Stage 1.3 admin action log, newest first —
 * powers /admin/action-log. Capped rather than paginated for now; revisit
 * if the list ever gets too long to scan usefully at a glance. */
export async function getAdminActionLog(limit = 200) {
  return withRlsContext({ role: "admin" }, (tx) =>
    tx
      .select({ entry: adminActionLog, actor: users })
      .from(adminActionLog)
      .innerJoin(users, eq(users.id, adminActionLog.actorUserId))
      .orderBy(desc(adminActionLog.createdAt))
      .limit(limit),
  );
}

export async function getAllAdmins() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      adminLevel: users.adminLevel,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.role, "admin"))
    .orderBy(users.createdAt);
}

export async function getVendorDetail(vendorProfileId: string, client: DbOrTx = db) {
  const vendorProfile = await getVendorProfileById(vendorProfileId);
  if (!vendorProfile) return null;

  const [vendorUser] = await client.select().from(users).where(eq(users.id, vendorProfile.userId)).limit(1);

  const [listingRow, documents, reviews, allJourneys] = await Promise.all([
    getVendorListingFull(vendorProfileId),
    client
      .select(vendorDocumentListColumns)
      .from(vendorDocuments)
      .where(eq(vendorDocuments.vendorProfileId, vendorProfileId))
      .orderBy(desc(vendorDocuments.uploadedAt)),
    client
      .select({ review: accreditationReviews, reviewer: users })
      .from(accreditationReviews)
      .innerJoin(users, eq(accreditationReviews.reviewerUserId, users.id))
      .where(eq(accreditationReviews.vendorProfileId, vendorProfileId))
      .orderBy(desc(accreditationReviews.decidedAt)),
    client.select().from(journeys).orderBy(journeys.sortOrder),
  ]);

  return { vendorProfile, vendorUser, listingRow, documents, reviews, allJourneys };
}

/** Lightweight count for the admin nav badge — avoids the full N+1 queue
 * fetch in getVendorApprovalQueue just to show a number. */
export async function getPendingAccreditationCount() {
  const [row] = await db.select({ total: count() }).from(vendorProfiles).where(eq(vendorProfiles.accreditationStatus, "pending"));
  return row?.total ?? 0;
}

export async function getVendorApprovalQueue(client: DbOrTx = db) {
  const rows = await client
    .select({ vendor: vendorProfiles, user: users })
    .from(vendorProfiles)
    .innerJoin(users, eq(vendorProfiles.userId, users.id))
    .orderBy(vendorProfiles.createdAt);

  return Promise.all(
    rows.map(async (row) => {
      const [listingRow, pendingDocs] = await Promise.all([
        getVendorListingWithOffer(row.vendor.id),
        client
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

/** Vendors with at least one confirmed-booking cancellation, worst first —
 * surfaced on the admin bookings dashboard alongside flagged bookings so
 * support can spot a vendor pattern, not just a one-off complaint. */
export async function getVendorsWithRecentCancellations() {
  const rows = await db
    .select({ vendor: vendorProfiles })
    .from(vendorProfiles)
    .where(gt(vendorProfiles.vendorCancellationCount, 0))
    .orderBy(desc(vendorProfiles.vendorCancellationCount));
  return rows.map((r) => r.vendor);
}

export async function getAllBookings() {
  return withRlsContext({ role: "admin" }, (tx) =>
    tx
      .select({
        booking: bookings,
        traveller: travellerProfiles,
        travellerUser: users,
        listing: listings,
        vendor: vendorProfiles,
        journey: journeys,
        appliedReward: rewards,
      })
      .from(bookings)
      .innerJoin(travellerProfiles, eq(bookings.travellerId, travellerProfiles.id))
      .innerJoin(users, eq(travellerProfiles.userId, users.id))
      .innerJoin(listings, eq(bookings.listingId, listings.id))
      .innerJoin(vendorProfiles, eq(listings.vendorProfileId, vendorProfiles.id))
      .leftJoin(journeys, eq(bookings.journeyId, journeys.id))
      .leftJoin(userRewards, eq(bookings.appliedUserRewardId, userRewards.id))
      .leftJoin(rewards, eq(userRewards.rewardId, rewards.id))
      .orderBy(desc(bookings.createdAt)),
  );
}

export async function getAllTravellersWithProgress() {
  const journeyList = await db.select().from(journeys).orderBy(journeys.sortOrder);
  const totalJourneys = journeyList.length;

  const rows = await db
    .select({ traveller: travellerProfiles, user: users })
    .from(travellerProfiles)
    .innerJoin(users, eq(travellerProfiles.userId, users.id))
    .orderBy(desc(travellerProfiles.createdAt));

  const allStamps = await withRlsContext({ role: "admin" }, (tx) => tx.select().from(stamps));
  const allCompletions = await db
    .select()
    .from(challengeCompletions)
    .where(eq(challengeCompletions.status, "verified"));
  const allBookings = await withRlsContext({ role: "admin" }, (tx) => tx.select().from(bookings));

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

/** All active events for the admin reward-target picker. */
export async function getAllEventsForAdmin() {
  return db.select().from(events).where(eq(events.active, true)).orderBy(events.startAt);
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
  const allBookings = await withRlsContext({ role: "admin" }, (tx) => tx.select().from(bookings));
  const allStamps = await withRlsContext({ role: "admin" }, (tx) => tx.select().from(stamps));
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

/** Every traveller who has crossed the influencer follower threshold,
 * with whichever of their posts have also crossed the like threshold —
 * see src/lib/influencer.ts. This is eligibility bookkeeping only, no
 * payout mechanism exists yet. */
export async function getInfluencersWithMonetizablePosts() {
  const [followRows, bonusRows] = await Promise.all([
    db.select({ followingId: follows.followingId }).from(follows),
    db.select({ id: travellerProfiles.id, bonusFollowers: travellerProfiles.bonusFollowers }).from(travellerProfiles),
  ]);

  const followerCounts = new Map<string, number>();
  for (const row of followRows) {
    followerCounts.set(row.followingId, (followerCounts.get(row.followingId) ?? 0) + 1);
  }
  for (const row of bonusRows) {
    if (row.bonusFollowers > 0) followerCounts.set(row.id, (followerCounts.get(row.id) ?? 0) + row.bonusFollowers);
  }

  const influencerIds = [...followerCounts.entries()]
    .filter(([, followerCount]) => isInfluencerByFollowers(followerCount))
    .map(([travellerId]) => travellerId);
  if (influencerIds.length === 0) return [];

  const [travellerRows, influencerPosts] = await Promise.all([
    db
      .select({ traveller: travellerProfiles, user: users })
      .from(travellerProfiles)
      .innerJoin(users, eq(users.id, travellerProfiles.userId))
      .where(inArray(travellerProfiles.id, influencerIds)),
    db
      .select()
      .from(postsTable)
      .where(and(inArray(postsTable.travellerId, influencerIds), eq(postsTable.status, "visible"))),
  ]);

  const { likeMap } = await getEngagementCounts(influencerPosts.map((p) => p.id));

  return travellerRows.map(({ traveller, user }) => {
    const eligiblePosts = influencerPosts
      .filter((p) => p.travellerId === traveller.id && (likeMap.get(p.id) ?? 0) >= MONETIZABLE_POST_LIKE_THRESHOLD)
      .map((p) => {
        const likes = likeMap.get(p.id) ?? 0;
        return { id: p.id, content: p.content, likes, earningsMinor: calculatePostEarningsMinor(likes) };
      });
    return {
      traveller,
      user,
      followers: followerCounts.get(traveller.id) ?? 0,
      eligiblePosts,
      totalEarningsMinor: eligiblePosts.reduce((sum, p) => sum + p.earningsMinor, 0),
    };
  });
}
