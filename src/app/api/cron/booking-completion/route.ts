import { NextResponse } from "next/server";
import { rejectUnauthorizedCron } from "@/lib/cron-auth";
import { and, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, events } from "@/db/schema";
import { notifyTravellerToReview } from "@/lib/booking-notifications";

// Flips "confirmed" bookings whose date has passed to "completed" — the
// only other place status reaches "completed" today is a manual admin
// toggle (adminSetBookingStatusAction). Bookings with neither a date nor
// an event (e.g. a vendor's own "event"-type listing ticket purchase,
// which collects no date at all) are left alone — still admin-only.
//
// Wired to Vercel Cron via vercel.json, same auth pattern as
// /api/cron/feed and /api/cron/reward-expiry.
export async function GET(request: Request) {
  const rejected = rejectUnauthorizedCron(request);
  if (rejected) return rejected;

  const today = new Date().toISOString().slice(0, 10);

  // Listing-sourced: hotel checkout / experience end date / rental return
  // date if set, otherwise the single visit date. Reviewable, so each one
  // also gets a review-prompt email.
  const dueListingBookings = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.status, "confirmed"),
        isNotNull(bookings.listingId),
        lt(sql`coalesce(${bookings.endDate}, ${bookings.visitDate})`, today),
      ),
    );

  if (dueListingBookings.length > 0) {
    await db
      .update(bookings)
      .set({ status: "completed" })
      .where(inArray(bookings.id, dueListingBookings.map((b) => b.id)));

    for (const { id } of dueListingBookings) {
      await notifyTravellerToReview(id);
    }
  }

  // Event-sourced: the standalone event's own start time.
  const dueEventBookings = await db
    .select({ id: bookings.id })
    .from(bookings)
    .innerJoin(events, eq(events.id, bookings.eventId))
    .where(and(eq(bookings.status, "confirmed"), lt(events.startAt, new Date())));

  if (dueEventBookings.length > 0) {
    await db
      .update(bookings)
      .set({ status: "completed" })
      .where(inArray(bookings.id, dueEventBookings.map((b) => b.id)));
  }

  return NextResponse.json({
    ok: true,
    completed: dueListingBookings.length + dueEventBookings.length,
  });
}
