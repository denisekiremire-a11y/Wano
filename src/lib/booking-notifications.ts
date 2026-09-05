import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, listings, travellerProfiles, users, vendorProfiles } from "@/db/schema";
import { notifyUser } from "@/lib/notify";

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
      vendorBusinessName: vendorProfiles.businessName,
      travellerEmail: users.email,
    })
    .from(bookings)
    .innerJoin(listings, eq(listings.id, bookings.listingId))
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, listings.vendorProfileId))
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, bookings.travellerId))
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!row) return;

  await notifyUser(row.travellerEmail, `Your booking ${message}`, [
    `Your booking with <strong>${row.vendorBusinessName}</strong> for <strong>${row.listingTitle}</strong> ${message}.`,
    `Confirmation code: ${row.booking.bookingRef}`,
    `<a href="${APP_URL}/bookings/${row.booking.bookingRef}">View your booking</a>.`,
  ]);
}

/** Emails the vendor when a traveller makes a new booking request against
 * one of their listings. */
export async function notifyVendorOfNewBooking(bookingId: string) {
  const [row] = await db
    .select({
      booking: bookings,
      listingTitle: listings.title,
      travellerName: travellerProfiles.displayName,
      vendorEmail: users.email,
    })
    .from(bookings)
    .innerJoin(listings, eq(listings.id, bookings.listingId))
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, listings.vendorProfileId))
    .innerJoin(users, eq(users.id, vendorProfiles.userId))
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, bookings.travellerId))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!row) return;

  await notifyUser(row.vendorEmail, "New booking request", [
    `<strong>${row.travellerName}</strong> requested to book <strong>${row.listingTitle}</strong>.`,
    `Confirmation code: ${row.booking.bookingRef}`,
    `<a href="${APP_URL}/vendor/dashboard/bookings">Respond in your dashboard</a>.`,
  ]);
}
