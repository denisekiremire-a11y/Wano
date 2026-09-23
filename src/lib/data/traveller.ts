import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import {
  bookingItems,
  bookings,
  challengeCompletions,
  challenges,
  events,
  interests,
  journeys,
  listings,
  promoCodes,
  referralCredits,
  rewards,
  savedListings,
  stamps,
  travellerInterests,
  travellerProfiles,
  userRewards,
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

/** A traveller's real, self-picked interests — used for the decorative
 * category chips on their public profile. Empty for anyone who hasn't set
 * any (no fabricated categories are shown in that case). */
export async function getTravellerInterests(travellerId: string) {
  return db
    .select({ key: interests.key, label: interests.label })
    .from(travellerInterests)
    .innerJoin(interests, eq(interests.id, travellerInterests.interestId))
    .where(eq(travellerInterests.travellerId, travellerId))
    .orderBy(interests.sortOrder);
}

export async function getTravellerProfileById(travellerId: string) {
  const [profile] = await db
    .select()
    .from(travellerProfiles)
    .where(eq(travellerProfiles.id, travellerId))
    .limit(1);
  return profile ?? null;
}

/** Looks up who a referral code belongs to — used for the signup form's
 * "Referred by {name}" confirmation. Returns null for an unknown code
 * without throwing, since an invalid code must never block sign-up. */
export async function getReferrerNameByCode(code: string) {
  const [profile] = await db
    .select({ displayName: travellerProfiles.displayName })
    .from(travellerProfiles)
    .where(eq(travellerProfiles.referralCode, code.trim().toUpperCase()))
    .limit(1);
  return profile?.displayName ?? null;
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
      event: events,
      journey: journeys,
    })
    .from(bookings)
    .leftJoin(listings, eq(bookings.listingId, listings.id))
    .leftJoin(events, eq(bookings.eventId, events.id))
    .leftJoin(journeys, eq(bookings.journeyId, journeys.id))
    .where(eq(bookings.travellerId, travellerId))
    .orderBy(bookings.createdAt);
}

/** This traveller's bookings for one specific listing — what a listing
 * page's "Your bookings and rewards" section shows under Bookings. */
export async function getMyBookingsForListing(travellerId: string, listingId: string) {
  return db
    .select({ booking: bookings })
    .from(bookings)
    .where(and(eq(bookings.travellerId, travellerId), eq(bookings.listingId, listingId)))
    .orderBy(desc(bookings.createdAt));
}

/** A single booking by its confirmation code, scoped to the traveller who
 * made it — used by the post-booking confirmation page. Returns null
 * rather than someone else's booking if the ref doesn't belong to them. */
export async function getBookingByRef(bookingRef: string, travellerId: string) {
  const [row] = await db
    .select({
      booking: bookings,
      listing: listings,
      event: events,
      vendor: vendorProfiles,
      journey: journeys,
      appliedReward: rewards,
    })
    .from(bookings)
    .leftJoin(listings, eq(bookings.listingId, listings.id))
    .leftJoin(events, eq(bookings.eventId, events.id))
    .leftJoin(
      vendorProfiles,
      or(eq(vendorProfiles.id, listings.vendorProfileId), eq(vendorProfiles.id, events.organizerVendorProfileId)),
    )
    .leftJoin(journeys, eq(bookings.journeyId, journeys.id))
    .leftJoin(userRewards, eq(bookings.appliedUserRewardId, userRewards.id))
    .leftJoin(rewards, eq(userRewards.rewardId, rewards.id))
    .where(and(eq(bookings.bookingRef, bookingRef), eq(bookings.travellerId, travellerId)))
    .limit(1);
  return row ?? null;
}

/** The room/vehicle/service/tickets/pre-order lines snapshotted onto one
 * booking at confirm time — used by the confirmation page's summary. */
export async function getBookingItems(bookingId: string) {
  return db.select().from(bookingItems).where(eq(bookingItems.bookingId, bookingId));
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

  const credits = await db
    .select({ status: referralCredits.status, points: referralCredits.points })
    .from(referralCredits)
    .where(eq(referralCredits.referrerId, travellerId));

  const awarded = credits.filter((c) => c.status === "awarded");
  const pending = credits.filter((c) => c.status === "pending");

  return {
    referralCode: profile?.referralCode ?? null,
    referredCount: referred.length,
    awardedCount: awarded.length,
    awardedPoints: awarded.reduce((sum, c) => sum + c.points, 0),
    pendingCount: pending.length,
  };
}

// Flips a referee's pending referral_credits row to "awarded" the moment
// their first-ever booking is confirmed — called from both the vendor and
// admin booking-confirmation actions. A no-op if there's no pending credit,
// or if this isn't actually their first confirmed/completed booking.
export async function awardReferralCreditOnFirstBooking(travellerId: string) {
  const [pendingCredit] = await db
    .select()
    .from(referralCredits)
    .where(and(eq(referralCredits.refereeId, travellerId), eq(referralCredits.status, "pending")))
    .limit(1);
  if (!pendingCredit) return;

  const priorConfirmed = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.travellerId, travellerId),
        or(eq(bookings.status, "confirmed"), eq(bookings.status, "completed")),
      ),
    );
  if (priorConfirmed.length > 1) return;

  await db
    .update(referralCredits)
    .set({ status: "awarded", awardedAt: new Date() })
    .where(eq(referralCredits.id, pendingCredit.id));
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
