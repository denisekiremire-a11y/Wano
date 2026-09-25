import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { bookings, events, listings, travellerProfiles, users, vendorProfiles } from "@/db/schema";
import { notifyAdmin, notifyUser } from "@/lib/notify";
import { toWhatsAppNumber } from "@/lib/afcon/phone";
import { sendWhatsappTemplate } from "@/lib/whatsapp";

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

/** Emails (and WhatsApps, if the vendor has a phone number on file) the
 * vendor/organizer when a traveller makes a new booking request against
 * one of their listings or events. No-ops if there's no one to notify
 * (an unorganized event has no vendor account behind it). */
export async function notifyVendorOfNewBooking(bookingId: string) {
  const [row] = await db
    .select({
      booking: bookings,
      listingTitle: listings.title,
      eventTitle: events.title,
      travellerName: travellerProfiles.displayName,
      vendorEmail: users.email,
      vendorPhone: vendorProfiles.contactPhone,
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

  const title = row.listingTitle ?? row.eventTitle ?? "a booking";
  await notifyUser(row.vendorEmail, "New booking request", [
    `<strong>${row.travellerName}</strong> requested to book <strong>${title}</strong>.`,
    `Confirmation code: ${row.booking.bookingRef}`,
    `<a href="${APP_URL}/vendor/dashboard/bookings">Respond in your dashboard</a>.`,
  ]);

  // Request mode — the vendor actually needs to act, so this is an
  // accept/decline prompt, not an FYI (see notifyVendorOfInstantBooking).
  const whatsappNumber = toWhatsAppNumber(row.vendorPhone);
  if (whatsappNumber) {
    await sendWhatsappTemplate({
      toPhone: whatsappNumber,
      templateName: "new_booking_request",
      parameters: [
        { name: "1", value: title },
        { name: "2", value: row.booking.partySize ? `${row.booking.partySize} people` : "" },
        { name: "3", value: row.booking.bookingRef },
      ],
    });
  }
}

/** Emails (and WhatsApps) the vendor an FYI for an instant-mode booking
 * that's already confirmed against their own slot capacity — no action
 * needed from them, unlike notifyVendorOfNewBooking's request-mode copy. */
export async function notifyVendorOfInstantBooking(bookingId: string) {
  const [row] = await db
    .select({
      booking: bookings,
      listingTitle: listings.title,
      travellerName: travellerProfiles.displayName,
      vendorEmail: users.email,
      vendorPhone: vendorProfiles.contactPhone,
    })
    .from(bookings)
    .innerJoin(listings, eq(listings.id, bookings.listingId))
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, listings.vendorProfileId))
    .innerJoin(users, eq(users.id, vendorProfiles.userId))
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, bookings.travellerId))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!row) return;

  const when = row.booking.visitDate
    ? `${row.booking.visitDate}${row.booking.visitTime ? ` at ${row.booking.visitTime}` : ""}`
    : "";
  await notifyUser(row.vendorEmail, "New booking confirmed", [
    `<strong>${row.travellerName}</strong> booked <strong>${row.listingTitle}</strong>${
      row.booking.partySize ? ` — party of ${row.booking.partySize}` : ""
    }${when ? `, ${when}` : ""}.`,
    `Already confirmed — no action needed from you. Confirmation code: ${row.booking.bookingRef}`,
    `<a href="${APP_URL}/vendor/dashboard/bookings">View in your dashboard</a>.`,
  ]);

  const whatsappNumber = toWhatsAppNumber(row.vendorPhone);
  if (whatsappNumber) {
    await sendWhatsappTemplate({
      toPhone: whatsappNumber,
      templateName: "new_booking_instant",
      parameters: [
        { name: "1", value: row.booking.partySize ? `${row.booking.partySize} people` : "1 person" },
        { name: "2", value: when || row.listingTitle },
        { name: "3", value: row.booking.bookingRef },
      ],
    });
  }
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

/** Emails the traveller when their request-mode booking expired
 * unanswered (see expirePendingRequests) — with up to
 * SIMILAR_LISTINGS_LIMIT alternatives they can try instead, so the dead
 * end has an obvious next step. */
export async function notifyTravellerOfRequestExpired(
  bookingId: string,
  similarListings: { id: string; title: string }[],
) {
  const [row] = await db
    .select({ booking: bookings, listingTitle: listings.title, travellerEmail: users.email })
    .from(bookings)
    .innerJoin(listings, eq(listings.id, bookings.listingId))
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, bookings.travellerId))
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!row) return;

  const lines = [
    `Your request to book <strong>${row.listingTitle}</strong> wasn't answered in time, so it's expired — no charge either way.`,
  ];
  if (similarListings.length > 0) {
    lines.push(
      "A few similar places you could try instead:",
      similarListings
        .map((l) => `<a href="${APP_URL}/explore/${l.id}">${l.title}</a>`)
        .join(" · "),
    );
  }
  await notifyUser(row.travellerEmail, "Your booking request expired", lines);
}

/** Emails the vendor when a traveller cancels their own confirmed booking
 * (see cancelBooking) — an FYI that the slot/table opened back up. */
export async function notifyVendorOfTravellerCancellation(bookingId: string) {
  const [row] = await db
    .select({ booking: bookings, listingTitle: listings.title, travellerName: travellerProfiles.displayName, vendorEmail: users.email })
    .from(bookings)
    .innerJoin(listings, eq(listings.id, bookings.listingId))
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, listings.vendorProfileId))
    .innerJoin(users, eq(users.id, vendorProfiles.userId))
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, bookings.travellerId))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!row) return;

  await notifyUser(row.vendorEmail, "Booking cancelled", [
    `<strong>${row.travellerName}</strong> cancelled their booking for <strong>${row.listingTitle}</strong> (ref ${row.booking.bookingRef}) — that slot is open again.`,
  ]);
}

/** Emails the traveller when a vendor cancels one of their already-
 * confirmed bookings (see vendorCancelConfirmedBooking) — distinct from
 * notifyTravellerOfBookingStatus's "declined" copy, which is about a
 * request-mode booking never being accepted in the first place; this is
 * a booking they were counting on being pulled out from under them, so
 * the tone (and the fact Wano is already looking into it) is different. */
export async function notifyTravellerOfVendorCancellation(bookingId: string, refunded: boolean) {
  const [row] = await db
    .select({ booking: bookings, listingTitle: listings.title, travellerEmail: users.email })
    .from(bookings)
    .innerJoin(listings, eq(listings.id, bookings.listingId))
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, bookings.travellerId))
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!row) return;

  await notifyUser(row.travellerEmail, "Your booking was cancelled by the venue", [
    `<strong>${row.listingTitle}</strong> (ref ${row.booking.bookingRef}) had to cancel your confirmed booking.`,
    refunded ? "You've been refunded automatically." : "",
    "We've flagged this for the Wano team to follow up with you.",
  ].filter(Boolean));

  await notifyAdmin("Vendor cancelled a confirmed booking", [
    `Ref ${row.booking.bookingRef} — <strong>${row.listingTitle}</strong> — flagged for support follow-up.`,
    `<a href="${APP_URL}/admin/bookings?status=cancelled">View in admin</a>.`,
  ]);
}
