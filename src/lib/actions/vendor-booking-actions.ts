"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { bookings, events, listings, stamps } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { notifyTravellerOfBookingStatus, notifyTravellerOfVendorCancellation } from "@/lib/booking-notifications";
import { withRlsContext } from "@/lib/db-context";
import { awardReferralCreditOnFirstBooking } from "@/lib/data/traveller";
import { getVendorProfileByUserId } from "@/lib/data/vendor";
import { vendorCancelConfirmedBooking } from "@/lib/slot-booking";
import type { ActionState } from "@/lib/validation";

export async function respondToBookingAction(
  bookingId: string,
  decision: "confirmed" | "cancelled",
) {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) throw new Error("Vendor profile not found.");

  // The booking's own status update runs as this vendor (matches
  // bookings' RLS: a vendor can only reach a row via their own listing or
  // event). Awarding a stamp to the traveller who booked is a
  // trusted-system write on their behalf (same reasoning as Round A's
  // auto-hide-on-report — ownership of the *booking* was already checked
  // above), so it runs in its own admin-equivalent transaction below.
  const confirmedBooking = await withRlsContext(
    { userId: session.userId, role: "vendor", vendorProfileId: vendorProfile.id },
    async (tx) => {
      const [row] = await tx
        .select({ booking: bookings, listing: listings, event: events })
        .from(bookings)
        .leftJoin(listings, eq(bookings.listingId, listings.id))
        .leftJoin(events, eq(bookings.eventId, events.id))
        .where(eq(bookings.id, bookingId))
        .limit(1);

      const ownerId = row?.listing?.vendorProfileId ?? row?.event?.organizerVendorProfileId;
      if (!row || ownerId !== vendorProfile.id) {
        throw new Error("You can only respond to bookings on your own listing or event.");
      }
      if (row.booking.status !== "pending") {
        return null;
      }
      // Lazy expiry, same reasoning as reserveSlotHold's capacity recompute —
      // don't trust the cron sweep's timing for correctness. A response
      // that arrives after the 2-hour window closed is too late regardless
      // of whether expirePendingRequests has run yet.
      if (row.booking.requestExpiresAt && row.booking.requestExpiresAt < new Date()) {
        await tx.update(bookings).set({ status: "expired" }).where(eq(bookings.id, bookingId));
        return null;
      }

      await tx.update(bookings).set({ status: decision }).where(eq(bookings.id, bookingId));
      return row.booking;
    },
  );
  if (!confirmedBooking) return;

  if (decision === "confirmed" && confirmedBooking.journeyId) {
    await withRlsContext({ role: "admin" }, async (tx) => {
      const [existingStamp] = await tx
        .select()
        .from(stamps)
        .where(
          and(
            eq(stamps.travellerId, confirmedBooking.travellerId),
            eq(stamps.journeyId, confirmedBooking.journeyId!),
          ),
        )
        .limit(1);

      if (!existingStamp) {
        await tx.insert(stamps).values({
          travellerId: confirmedBooking.travellerId,
          journeyId: confirmedBooking.journeyId!,
          bookingId: confirmedBooking.id,
        });
      }
    });
  }

  if (decision === "confirmed") {
    await awardReferralCreditOnFirstBooking(confirmedBooking.travellerId);
  }

  await notifyTravellerOfBookingStatus(bookingId, decision);

  revalidatePath("/vendor/dashboard/bookings");
  revalidatePath("/vendor/dashboard/referrals");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/passport");
  revalidatePath("/dashboard/discounts");
  revalidatePath("/dashboard/bookings");
}

/** Vendor cancelling a booking that was already confirmed — the actual
 * refund/capacity-release/flag/counter logic lives in
 * vendorCancelConfirmedBooking; this is the ownership check plus the
 * Next-specific side effects around it. Unlike respondToBookingAction
 * (which only ever handles a still-pending request), this always refunds
 * and always flags for support — cancelling something a traveller was
 * already counting on is a different, more serious event. */
export async function vendorCancelConfirmedBookingAction(bookingId: string): Promise<ActionState> {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return { error: "Vendor profile not found." };

  const row = await withRlsContext(
    { userId: session.userId, role: "vendor", vendorProfileId: vendorProfile.id },
    (tx) =>
      tx
        .select({ booking: bookings, listing: listings, event: events })
        .from(bookings)
        .leftJoin(listings, eq(bookings.listingId, listings.id))
        .leftJoin(events, eq(bookings.eventId, events.id))
        .where(eq(bookings.id, bookingId))
        .limit(1)
        .then((rows) => rows[0]),
  );

  const ownerId = row?.listing?.vendorProfileId ?? row?.event?.organizerVendorProfileId;
  if (!row || ownerId !== vendorProfile.id) {
    return { error: "You can only cancel bookings on your own listing or event." };
  }

  const result = await vendorCancelConfirmedBooking(bookingId);
  if ("error" in result) return { error: result.error };

  await notifyTravellerOfVendorCancellation(bookingId, result.refunded);

  revalidatePath("/vendor/dashboard/bookings");
  revalidatePath("/admin/bookings");
  revalidatePath("/passport");

  return {};
}
