import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  bookings,
  challengeCompletions,
  challenges,
  journeys,
  listings,
  promoCodes,
  savedListings,
  stamps,
  travellerProfiles,
  vendorProfiles,
} from "@/db/schema";
import { getPublicListingsForJourney } from "./journeys";

export async function getTravellerProfileByUserId(userId: string) {
  const [profile] = await db
    .select()
    .from(travellerProfiles)
    .where(eq(travellerProfiles.userId, userId))
    .limit(1);
  return profile ?? null;
}

export async function getPassportProgress(travellerId: string) {
  const journeyList = await db.select().from(journeys).orderBy(journeys.sortOrder);
  const earnedStamps = await db.select().from(stamps).where(eq(stamps.travellerId, travellerId));
  const earnedJourneyIds = new Set(earnedStamps.map((s) => s.journeyId));

  const progress = journeyList.map((journey) => ({
    journey,
    earned: earnedJourneyIds.has(journey.id),
    earnedAt: earnedStamps.find((s) => s.journeyId === journey.id)?.earnedAt ?? null,
  }));

  return {
    progress,
    stampCount: earnedJourneyIds.size,
    totalJourneys: journeyList.length,
    grandPrizeQualified: earnedJourneyIds.size >= journeyList.length,
  };
}

export async function getUnlockedOffersForTraveller(travellerId: string) {
  const earnedStamps = await db.select().from(stamps).where(eq(stamps.travellerId, travellerId));
  const earnedJourneyIds = earnedStamps.map((s) => s.journeyId);

  const allJourneys = await db.select().from(journeys).orderBy(journeys.sortOrder);

  const results = await Promise.all(
    allJourneys.map(async (journey) => ({
      journey,
      unlocked: earnedJourneyIds.includes(journey.id),
      offers: await getPublicListingsForJourney(journey.id),
    })),
  );

  return results;
}

export async function getActivePromoCodesForTraveller(travellerId: string) {
  const earnedStamps = await db.select().from(stamps).where(eq(stamps.travellerId, travellerId));
  const earnedJourneyIds = earnedStamps.map((s) => s.journeyId);

  // Listing-scoped promos show on that specific place's card instead of here.
  const rows = await db
    .select({ promo: promoCodes, journey: journeys })
    .from(promoCodes)
    .leftJoin(journeys, eq(promoCodes.journeyId, journeys.id))
    .where(and(eq(promoCodes.active, true), isNull(promoCodes.listingId)));

  return rows.filter(
    (row) => row.promo.journeyId === null || earnedJourneyIds.includes(row.promo.journeyId),
  );
}

export async function getTravellerBookings(travellerId: string) {
  return db
    .select({
      booking: bookings,
      listing: listings,
      journey: journeys,
    })
    .from(bookings)
    .innerJoin(listings, eq(bookings.listingId, listings.id))
    .leftJoin(journeys, eq(bookings.journeyId, journeys.id))
    .where(eq(bookings.travellerId, travellerId))
    .orderBy(bookings.createdAt);
}

/** A single booking by its confirmation code, scoped to the traveller who
 * made it — used by the post-booking confirmation page. Returns null
 * rather than someone else's booking if the ref doesn't belong to them. */
export async function getBookingByRef(bookingRef: string, travellerId: string) {
  const [row] = await db
    .select({ booking: bookings, listing: listings, vendor: vendorProfiles, journey: journeys })
    .from(bookings)
    .innerJoin(listings, eq(bookings.listingId, listings.id))
    .innerJoin(vendorProfiles, eq(listings.vendorProfileId, vendorProfiles.id))
    .leftJoin(journeys, eq(bookings.journeyId, journeys.id))
    .where(and(eq(bookings.bookingRef, bookingRef), eq(bookings.travellerId, travellerId)))
    .limit(1);
  return row ?? null;
}

export async function getReferralStats(travellerId: string) {
  const [profile] = await db
    .select()
    .from(travellerProfiles)
    .where(eq(travellerProfiles.id, travellerId))
    .limit(1);

  const referred = await db
    .select({ id: travellerProfiles.id })
    .from(travellerProfiles)
    .where(eq(travellerProfiles.referredByTravellerId, travellerId));

  return { referralCode: profile?.referralCode ?? null, referredCount: referred.length };
}

export async function getSavedListingsForTraveller(travellerId: string) {
  return db
    .select({ saved: savedListings, listing: listings, vendor: vendorProfiles })
    .from(savedListings)
    .innerJoin(listings, eq(savedListings.listingId, listings.id))
    .innerJoin(vendorProfiles, eq(listings.vendorProfileId, vendorProfiles.id))
    .where(eq(savedListings.travellerId, travellerId))
    .orderBy(desc(savedListings.createdAt));
}

export async function getChallengesWithStatus(travellerId: string) {
  const allChallenges = await db.select().from(challenges).orderBy(challenges.sortOrder);
  const completions = await db
    .select()
    .from(challengeCompletions)
    .where(eq(challengeCompletions.travellerId, travellerId));

  return allChallenges.map((challenge) => ({
    challenge,
    completion: completions.find((c) => c.challengeId === challenge.id) ?? null,
  }));
}
