import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bookings, listings, reviews, travellerProfiles, users } from "@/db/schema";

export type RatingSummary = { average: number; count: number };

/** Bulk rating summary for a set of listings — avoids N+1 queries when
 * rendering a grid of cards. */
export async function getRatingSummaries(listingIds: string[]) {
  const map = new Map<string, RatingSummary>();
  if (listingIds.length === 0) return map;

  const rows = await db
    .select({ listingId: reviews.listingId, rating: reviews.rating })
    .from(reviews)
    .where(inArray(reviews.listingId, listingIds));

  const byListing = new Map<string, number[]>();
  for (const row of rows) {
    const list = byListing.get(row.listingId) ?? [];
    list.push(row.rating);
    byListing.set(row.listingId, list);
  }
  for (const [listingId, ratings] of byListing) {
    map.set(listingId, {
      average: ratings.reduce((sum, r) => sum + r, 0) / ratings.length,
      count: ratings.length,
    });
  }
  return map;
}

export async function getRatingSummary(listingId: string): Promise<RatingSummary> {
  const map = await getRatingSummaries([listingId]);
  return map.get(listingId) ?? { average: 0, count: 0 };
}

export async function getReviewsForListing(listingId: string) {
  return db
    .select({ review: reviews, travellerUser: users })
    .from(reviews)
    .innerJoin(travellerProfiles, eq(reviews.travellerId, travellerProfiles.id))
    .innerJoin(users, eq(travellerProfiles.userId, users.id))
    .where(eq(reviews.listingId, listingId))
    .orderBy(desc(reviews.createdAt));
}

export async function getReviewsByTraveller(travellerId: string) {
  return db
    .select({ review: reviews, listing: listings })
    .from(reviews)
    .innerJoin(listings, eq(reviews.listingId, listings.id))
    .where(eq(reviews.travellerId, travellerId))
    .orderBy(desc(reviews.createdAt));
}

/** Completed bookings for a traveller that don't have a review yet — these
 * are what prompts a "leave a review" call-to-action. */
export async function getReviewableBookings(travellerId: string) {
  const completedBookings = await db
    .select({ booking: bookings, listing: listings })
    .from(bookings)
    .innerJoin(listings, eq(bookings.listingId, listings.id))
    .where(eq(bookings.travellerId, travellerId));

  const existingReviews = await db
    .select({ bookingId: reviews.bookingId })
    .from(reviews)
    .where(eq(reviews.travellerId, travellerId));
  const reviewedBookingIds = new Set(existingReviews.map((r) => r.bookingId));

  return completedBookings
    .filter((row) => row.booking.status === "completed" && !reviewedBookingIds.has(row.booking.id))
    .map((row) => row);
}
