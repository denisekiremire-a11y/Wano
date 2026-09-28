import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingThread } from "@/components/booking-thread";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { CopyCodeButton } from "@/components/copy-code-button";
import { ShareBookingButton } from "@/components/share-booking-button";
import { TicketQrCard } from "@/components/ticket-qr-card";
import { requireRole } from "@/lib/auth";
import { CANCELLATION_CUTOFF_HOURS } from "@/lib/booking-config";
import { formatMinor } from "@/lib/currency";
import { getBookingByRef, getBookingItems, getTravellerProfileByUserId } from "@/lib/data/traveller";
import { verifyFlutterwaveTransaction } from "@/lib/flutterwave";
import { formatRewardDiscount } from "@/lib/reward-format";
import { confirmBookingPayment, hoursUntilVisit } from "@/lib/slot-booking";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const STATUS_COPY: Record<string, { label: string; detail: string }> = {
  held: {
    label: "Finishing payment…",
    detail: "Your spot is reserved for a few minutes while checkout completes. Refresh once you've paid.",
  },
  pending: {
    label: "Booking request sent",
    detail: "This is confirmed on our end — we've passed it to the partner, who'll accept it from their dashboard shortly.",
  },
  confirmed: {
    label: "Booking confirmed",
    detail: "Show this code when you arrive.",
  },
  completed: {
    label: "Booking completed",
    detail: "This booking has already happened. Thanks for travelling with Wano!",
  },
  cancelled: {
    label: "Booking cancelled",
    detail: "This booking was cancelled and is no longer active.",
  },
  expired: {
    label: "Booking expired",
    detail: "This reservation wasn't completed in time and the spot was released. Book again if it's still available.",
  },
};

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ bookingTxRef?: string; status?: string; transaction_id?: string }>;
}) {
  const { ref } = await params;
  const { bookingTxRef, status: flwStatus, transaction_id: flwTransactionId } = await searchParams;
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return null;

  let row = await getBookingByRef(ref, travellerProfile.id);
  if (!row) notFound();

  // The checkout redirect back from Flutterwave — one of two independent
  // confirmation paths alongside the webhook (see
  // /api/webhooks/flutterwave); confirmBookingPayment is idempotent, so
  // this is a safe no-op if the webhook already confirmed it.
  let capacityLost = false;
  if (bookingTxRef === row.booking.id && flwStatus === "successful" && flwTransactionId) {
    const result = await confirmBookingPayment(row.booking.id, flwTransactionId, verifyFlutterwaveTransaction);
    if (result.outcome === "capacity_lost") capacityLost = true;
    if (result.outcome === "confirmed" || result.outcome === "capacity_lost") {
      row = await getBookingByRef(ref, travellerProfile.id);
      if (!row) notFound();
    }
  }
  const paymentFailed = bookingTxRef === row.booking.id && flwStatus != null && flwStatus !== "successful";

  const { booking, listing, event, vendor, journey, appliedReward } = row;
  const status = STATUS_COPY[booking.status] ?? STATUS_COPY.pending;
  const lineItems = await getBookingItems(booking.id, travellerProfile.id);
  const title = listing?.title ?? event?.title ?? "Booking";
  const subtitle = listing
    ? [vendor?.businessName, vendor?.location].filter(Boolean).join(" · ")
    : [vendor?.businessName, event?.location].filter(Boolean).join(" · ");
  const directionsUrl =
    listing?.latitude && listing?.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${listing.latitude},${listing.longitude}`
      : null;
  const isTicket = (event != null || listing?.type === "event") && booking.status !== "cancelled";

  const hoursUntilSlot = booking.visitDate ? hoursUntilVisit(booking.visitDate, booking.visitTime) : null;
  const canCancelForFree = hoursUntilSlot == null || hoursUntilSlot >= CANCELLATION_CUTOFF_HOURS;
  // held/pending: always cancellable, never a refund (nothing was charged
  // yet — see cancelBooking). confirmed: only cancellable outside the free
  // window, and refunds when it is; inside the window, cancelBooking
  // itself would just reject it, so the button isn't offered at all.
  const canCancel =
    booking.status === "held" ||
    booking.status === "pending" ||
    (booking.status === "confirmed" && canCancelForFree);
  const cancelRefunds = booking.status === "confirmed";
  const statusColorClass =
    booking.status === "confirmed"
      ? "text-ink"
      : booking.status === "cancelled" || booking.status === "completed" || booking.status === "expired"
        ? "text-ink/40"
        : "text-ember";

  return (
    <main className="font-editorial-body bg-paper">
      <section className="mx-auto max-w-lg px-4 py-10 md:px-6">
        {paymentFailed && booking.status !== "confirmed" && (
          <div className="mb-4 border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Payment didn&apos;t go through, so this spot wasn&apos;t reserved. Try booking again.
          </div>
        )}
        {capacityLost && (
          <div className="mb-4 border border-gold/40 bg-gold/10 p-4 text-sm text-ink">
            Your payment went through, but this slot filled up before we could confirm it — you&apos;ve been
            refunded automatically. Sorry about that; try another time slot.
          </div>
        )}
        <div className="flex flex-col items-center text-center">
          <p className={`eyebrow capitalize ${statusColorClass}`}>{booking.status}</p>
          <h1 className="font-serif-editorial mt-3 text-3xl text-ink">{status.label}</h1>
          <p className="mt-2 max-w-sm text-sm text-ink/60">{status.detail}</p>
        </div>

        {isTicket && (
          <div className="mt-6">
            <TicketQrCard bookingId={booking.id} title={title} bookingRef={booking.bookingRef} />
          </div>
        )}

        <div className="mt-6 border border-ink/10 bg-white p-6 text-center">
          <p className="eyebrow text-ink/40">Confirmation code</p>
          <p className="font-mono-data mt-1 text-3xl font-bold text-ink">{booking.bookingRef}</p>
          <div className="mt-3 flex justify-center">
            <CopyCodeButton code={booking.bookingRef} />
          </div>
        </div>

        <div className="mt-4 border border-ink/10 bg-white p-5">
          <p className="font-serif-editorial text-xl text-ink">{title}</p>
          {subtitle && <p className="text-sm text-ink/60">{subtitle}</p>}
          <div className="mt-3 space-y-1 border-t border-ink/10 pt-3 text-sm text-ink/70">
            {event && (
              <p>
                {new Intl.DateTimeFormat("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(event.startAt))}
              </p>
            )}
            {booking.bookingName && <p>Reservation name: {booking.bookingName}</p>}
            {booking.visitDate && (
              <p>
                {booking.endDate ? "From" : "Visit date:"} {booking.visitDate}
                {booking.visitTime ? ` at ${booking.visitTime}` : ""}
                {booking.endDate ? ` → ${booking.endDate}` : ""}
              </p>
            )}
            {booking.partySize && (
              <p>
                Party size: {booking.partySize}
                {booking.childrenCount ? ` + ${booking.childrenCount} children` : ""}
              </p>
            )}
            {(booking.pickupLocation || booking.dropoffLocation) && (
              <p>
                {booking.pickupLocation} {booking.dropoffLocation ? `→ ${booking.dropoffLocation}` : ""}
              </p>
            )}
            {booking.notes && <p>Notes: {booking.notes}</p>}
            {appliedReward && (
              <p>
                Reward applied: {appliedReward.title} —{" "}
                {formatRewardDiscount(appliedReward.discountType, appliedReward.discountValue)} (confirmed
                in person at the venue)
              </p>
            )}
            {journey && (
              <p>
                Part of your{" "}
                <Link href={`/journeys/${journey.slug}`} className="font-medium text-ember hover:underline">
                  {journey.name}
                </Link>{" "}
                journey
              </p>
            )}
          </div>

          {lineItems.length > 0 && (
            <div className="font-mono-data mt-3 space-y-1 border-t border-ink/10 pt-3 text-sm">
              {lineItems.map((li) => (
                <p key={li.id} className="flex justify-between text-ink/70">
                  <span>
                    {li.quantity} × {li.nameAtBooking}
                  </span>
                  {li.priceMinorAtBooking != null && <span>{formatMinor(li.priceMinorAtBooking * li.quantity)}</span>}
                </p>
              ))}
            </div>
          )}

          {booking.totalMinor != null && (
            <div className="font-mono-data mt-3 space-y-1 border-t border-ink/10 pt-3 text-sm">
              {booking.subtotalMinor != null && booking.subtotalMinor !== booking.totalMinor && (
                <p className="flex justify-between text-ink/60">
                  <span>Subtotal</span>
                  <span>{formatMinor(booking.subtotalMinor)}</span>
                </p>
              )}
              <p className="flex justify-between text-base font-semibold text-ink">
                <span>Total</span>
                <span>{formatMinor(booking.totalMinor)}</span>
              </p>
            </div>
          )}
        </div>

        {(canCancel || booking.status === "confirmed") && (
          <div className="mt-4 border border-ink/10 bg-white p-4 text-center text-sm">
            {canCancel ? (
              <>
                <p className="text-ink/60">
                  {cancelRefunds
                    ? `Free cancellation up to ${CANCELLATION_CUTOFF_HOURS} hours before your slot — you'll be refunded automatically.`
                    : "This hasn't been paid for yet, so you can cancel anytime with nothing to refund."}
                </p>
                <div className="mt-3 flex justify-center">
                  <CancelBookingButton bookingId={booking.id} refunds={cancelRefunds} />
                </div>
              </>
            ) : (
              <p className="text-ink/60">
                This booking is now within {CANCELLATION_CUTOFF_HOURS} hours of the slot, so it&apos;s no longer
                eligible for free cancellation.
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {journey && (
            <Link
              href={`/journeys/${journey.slug}`}
              className="rounded-full border border-ink/20 px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink/5"
            >
              View your {journey.name} trip
            </Link>
          )}
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-ink/20 px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink/5"
            >
              Get directions
            </a>
          )}
          {vendor && (
            <a
              href="#message-provider"
              className="rounded-full border border-ink/20 px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink/5"
            >
              Contact provider
            </a>
          )}
          <ShareBookingButton title={`${title} — Wano booking`} url={`${APP_URL}/bookings/${booking.bookingRef}`} />
        </div>

        {vendor && (
          <div id="message-provider" className="mt-4 scroll-mt-20">
            <BookingThread bookingId={booking.id} heading={`Message ${vendor.businessName}`} />
          </div>
        )}

        <div className="mt-4 border border-gold/40 bg-gold/10 p-4 text-sm text-ink">
          <p className="font-medium">Haven&apos;t heard back?</p>
          <p className="mt-1 text-ink/70">
            If you haven&apos;t received a confirmation email, or the vendor or Wano hasn&apos;t messaged
            you within 5 minutes, call or WhatsApp us on{" "}
            <a href="tel:0771013268" className="font-semibold text-ember underline">
              0771013268
            </a>{" "}
            (
            <a
              href="https://wa.me/256771013268"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-ember underline"
            >
              WhatsApp
            </a>
            ).
          </p>
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/passport"
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/85"
          >
            View all your bookings
          </Link>
          <Link
            href="/explore"
            className="rounded-full border border-ink/20 px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink/5"
          >
            Keep exploring
          </Link>
        </div>
      </section>
    </main>
  );
}
