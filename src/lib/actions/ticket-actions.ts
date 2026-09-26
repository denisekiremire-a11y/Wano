"use server";

import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { bookings, events, listings, travellerProfiles } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import type { DbOrTx } from "@/lib/db-context";
import { withRlsContext } from "@/lib/db-context";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { getVendorProfileByUserId } from "@/lib/data/vendor";
import { signTicketToken, verifyTicketToken } from "@/lib/ticket-token";
import type { ActionState } from "@/lib/validation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function revalidateTicketPaths() {
  revalidatePath("/vendor/dashboard/redeem/tickets");
}

async function getTicketBookingRow(bookingId: string, client: DbOrTx = db) {
  const [row] = await client
    .select({
      booking: bookings,
      listing: listings,
      event: events,
      travellerName: travellerProfiles.displayName,
    })
    .from(bookings)
    .leftJoin(listings, eq(listings.id, bookings.listingId))
    .leftJoin(events, eq(events.id, bookings.eventId))
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, bookings.travellerId))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  return row ?? null;
}

/** A booking is a "ticket" when it's against a standalone event or a
 * vendor's own "event"-type listing — every other listing type (hotel,
 * restaurant, ...) is a reservation, not something scanned at a door. */
function isTicketEligible(row: NonNullable<Awaited<ReturnType<typeof getTicketBookingRow>>>) {
  return row.event != null || row.listing?.type === "event";
}

export type TicketCheck =
  | { ok: true; travellerName: string; title: string; partySize: number | null; bookingRef: string }
  | {
      ok: false;
      reason: "invalid" | "not_a_ticket" | "already_checked_in" | "wrong_venue" | "cancelled";
      detail?: string;
    };

async function checkTicketRedeemable(bookingId: string, vendorProfileId: string, client: DbOrTx = db): Promise<TicketCheck> {
  const row = await getTicketBookingRow(bookingId, client);
  if (!row) return { ok: false, reason: "invalid" };
  if (!isTicketEligible(row)) return { ok: false, reason: "not_a_ticket" };

  const owningVendorId = row.listing?.vendorProfileId ?? row.event?.organizerVendorProfileId ?? null;
  if (owningVendorId !== vendorProfileId) return { ok: false, reason: "wrong_venue" };

  if (row.booking.status === "cancelled") return { ok: false, reason: "cancelled" };
  if (row.booking.checkedInAt) {
    return { ok: false, reason: "already_checked_in", detail: row.booking.checkedInAt.toLocaleString() };
  }

  return {
    ok: true,
    travellerName: row.travellerName,
    title: row.listing?.title ?? row.event?.title ?? "",
    partySize: row.booking.partySize,
    bookingRef: row.booking.bookingRef,
  };
}

/** Generates a fresh 120s signed QR for a ticket the caller owns — same
 * refresh-while-open pattern as generateRewardQrAction. */
export async function generateTicketQrAction(bookingId: string) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) throw new Error("Traveller profile not found.");

  const row = await withRlsContext(
    { userId: session.userId, role: "traveller", travellerProfileId: travellerProfile.id },
    (tx) => getTicketBookingRow(bookingId, tx),
  );
  if (!row || row.booking.travellerId !== travellerProfile.id) throw new Error("Booking not found.");

  const token = await signTicketToken(bookingId);
  const verifyUrl = `${APP_URL}/vendor/dashboard/redeem/tickets/token/${token}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 240 });

  return { qrDataUrl, expiresInSeconds: 120 };
}

/** Server-side check for the /vendor/dashboard/redeem/tickets/token/[token]
 * page — validates the QR token's own signature/expiry before ever
 * looking at the booking. */
export async function verifyTicketTokenForVendor(token: string): Promise<TicketCheck & { bookingId?: string }> {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return { ok: false, reason: "invalid" };

  const decoded = await verifyTicketToken(token);
  if (!decoded) return { ok: false, reason: "invalid" };

  const result = await withRlsContext(
    { userId: session.userId, role: "vendor", vendorProfileId: vendorProfile.id },
    (tx) => checkTicketRedeemable(decoded.bookingId, vendorProfile.id, tx),
  );
  return { ...result, bookingId: decoded.bookingId };
}

export async function lookupTicketByRefForVendor(bookingRef: string): Promise<TicketCheck & { bookingId?: string }> {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return { ok: false, reason: "invalid" };

  // Resolved under an admin-equivalent context, not this vendor's own —
  // otherwise a ticket for someone else's venue would be invisible to this
  // lookup entirely (RLS-filtered out) rather than found and correctly
  // rejected as "wrong_venue" by checkTicketRedeemable just below, same
  // distinction the UI already relies on.
  const row = await withRlsContext({ role: "admin" }, (tx) =>
    tx
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.bookingRef, bookingRef.trim().toUpperCase()))
      .limit(1)
      .then((rows) => rows[0]),
  );
  if (!row) return { ok: false, reason: "invalid" };

  const result = await withRlsContext(
    { userId: session.userId, role: "vendor", vendorProfileId: vendorProfile.id },
    (tx) => checkTicketRedeemable(row.id, vendorProfile.id, tx),
  );
  return { ...result, bookingId: row.id };
}

export async function checkInTicketAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const bookingId = formData.get("bookingId");
  if (typeof bookingId !== "string" || !bookingId) return { error: "Missing ticket." };

  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return { error: "Vendor profile not found." };

  const result = await withRlsContext(
    { userId: session.userId, role: "vendor", vendorProfileId: vendorProfile.id },
    async (tx) => {
      const check = await checkTicketRedeemable(bookingId, vendorProfile.id, tx);
      if (!check.ok) return check;
      await tx.update(bookings).set({ checkedInAt: new Date() }).where(eq(bookings.id, bookingId));
      return check;
    },
  );
  if (!result.ok) {
    const messages: Record<Exclude<TicketCheck, { ok: true }>["reason"], string> = {
      invalid: "Ticket not found.",
      not_a_ticket: "This booking isn't a ticket.",
      already_checked_in: `Already checked in${result.detail ? ` (${result.detail})` : ""}.`,
      wrong_venue: "This ticket isn't for your venue.",
      cancelled: "This booking was cancelled.",
    };
    return { error: messages[result.reason] };
  }

  revalidateTicketPaths();

  return {};
}
