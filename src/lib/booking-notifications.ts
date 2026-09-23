import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { bookings, events, listings, travellerProfiles, users, vendorProfiles } from "@/db/schema";
import { notifyAdmin, notifyUser } from "@/lib/notify";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const STATUS_MESSAGE: Partial<Record<string, string>> = {
  confirmed: "has been confirmed by the partner",
  cancelled: "was declined by the partner",
  completed: "is marked completed",
};

/** Emails the traveller when their booking's status changes — confirmed,
 * cancelled, or completed. No-ops for "pending" (nothing to tell them yet). */
export async function notifyTravellerOfBookingStatus(bookingId: string, status: string) {
  const message = STATUS_MESSAGE[status];
  if (!message) return;

  const [row] = await db
    .select({
      booking: bookings,
      listingTitle: listings.title,
      eventTitle: events.title,
      vendorBusinessName: vendorProfiles.businessName,
      travellerEmail: users.email,
    })
    .from(bookings)
    .leftJoin(listings, eq(listings.id, bookings.listingId))
    .leftJoin(events, eq(events.id, bookings.eventId))
    .leftJoin(
      vendorProfiles,
      or(eq(vendorProfiles.id, listings.vendorProfileId), eq(vendorProfiles.id, events.organizerVendorProfileId)),
    )
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, bookings.travellerId))
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!row) return;

  const title = row.listingTitle ?? row.eventTitle;
  await notifyUser(row.travellerEmail, `Your booking ${message}`, [
    row.vendorBusinessName
      ? `Your booking with <strong>${row.vendorBusinessName}</strong> for <strong>${title}</strong> ${message}.`
      : `Your booking for <strong>${title}</strong> ${message}.`,
    `Confirmation code: ${row.booking.bookingRef}`,
    `<a href="${APP_URL}/bookings/${row.booking.bookingRef}">View your booking</a>.`,
  ]);
}

/** Emails the traveller a nudge to review, right after their booking is
 * auto-completed — separate from notifyTravellerOfBookingStatus's generic
 * "is marked completed" message, and only sent for listing-sourced
 * bookings (reviews are listing-only, per the reviews schema). */
export async function notifyTravellerToReview(bookingId: string) {
  const [row] = await db
    .select({
      booking: bookings,
      listingTitle: listings.title,
      travellerEmail: users.email,
    })
    .from(bookings)
    .innerJoin(listings, eq(listings.id, bookings.listingId))
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, bookings.travellerId))
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!row) return;

  await notifyUser(row.travellerEmail, "How was your trip?", [
    `Your booking for <strong>${row.listingTitle}</strong> is complete — tell other travellers how it went.`,
    `<a href="${APP_URL}/passport?tab=bookings#booking-${bookingId}">Leave a review</a>.`,
  ]);
}

/** Emails the vendor/organizer when a traveller makes a new booking request
 * against one of their listings or events. No-ops if there's no one to
 * notify (an unorganized event has no vendor account behind it). */
export async function notifyVendorOfNewBooking(bookingId: string) {
  const [row] = await db
    .select({
      booking: bookings,
      listingTitle: listings.title,
      eventTitle: events.title,
      travellerName: travellerProfiles.displayName,
      vendorEmail: users.email,
    })
    .from(bookings)
    .leftJoin(listings, eq(listings.id, bookings.listingId))
    .leftJoin(events, eq(events.id, bookings.eventId))
    .leftJoin(
      vendorProfiles,
      or(eq(vendorProfiles.id, listings.vendorProfileId), eq(vendorProfiles.id, events.organizerVendorProfileId)),
    )
    .leftJoin(users, eq(users.id, vendorProfiles.userId))
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, bookings.travellerId))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!row || !row.vendorEmail) return;

  const title = row.listingTitle ?? row.eventTitle;
  await notifyUser(row.vendorEmail, "New booking request", [
    `<strong>${row.travellerName}</strong> requested to book <strong>${title}</strong>.`,
    `Confirmation code: ${row.booking.bookingRef}`,
    `<a href="${APP_URL}/vendor/dashboard/bookings">Respond in your dashboard</a>.`,
  ]);
}

/** Confirms to the traveller that their booking request went through —
 * separate from notifyTravellerOfBookingStatus, which only fires once the
 * vendor actually responds. */
export async function notifyTravellerOfNewBooking(bookingId: string) {
  const [row] = await db
    .select({
      booking: bookings,
      listingTitle: listings.title,
      eventTitle: events.title,
      vendorBusinessName: vendorProfiles.businessName,
      travellerName: travellerProfiles.displayName,
      travellerEmail: users.email,
    })
    .from(bookings)
    .leftJoin(listings, eq(listings.id, bookings.listingId))
    .leftJoin(events, eq(events.id, bookings.eventId))
    .leftJoin(
      vendorProfiles,
      or(eq(vendorProfiles.id, listings.vendorProfileId), eq(vendorProfiles.id, events.organizerVendorProfileId)),
    )
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, bookings.travellerId))
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!row) return;

  const title = row.listingTitle ?? row.eventTitle;
  await notifyUser(row.travellerEmail, "Booking request sent", [
    row.vendorBusinessName
      ? `Your request to book <strong>${title}</strong> with <strong>${row.vendorBusinessName}</strong> is in.`
      : `Your request to book <strong>${title}</strong> is in.`,
    `Confirmation code: ${row.booking.bookingRef}`,
    `<a href="${APP_URL}/bookings/${row.booking.bookingRef}">View your booking</a>.`,
  ]);

  await notifyAdmin("New booking", [
    `<strong>${row.travellerName}</strong> booked <strong>${title}</strong>${row.vendorBusinessName ? ` (${row.vendorBusinessName})` : ""}.`,
    `Confirmation code: ${row.booking.bookingRef}`,
    `<a href="${APP_URL}/admin/bookings">View in admin</a>.`,
  ]);
}
