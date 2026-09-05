import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingThread } from "@/components/booking-thread";
import { CheckCircleIcon } from "@/components/icons";
import { CopyCodeButton } from "@/components/copy-code-button";
import { requireRole } from "@/lib/auth";
import { getBookingByRef, getTravellerProfileByUserId } from "@/lib/data/traveller";

const STATUS_COPY: Record<string, { label: string; detail: string }> = {
  pending: {
    label: "Booking request sent",
    detail: "This is confirmed on our end — we've passed it to the partner, who'll accept it from their dashboard shortly.",
  },
  confirmed: {
    label: "Booking confirmed",
    detail: "The partner has accepted your request. Show this code when you arrive.",
  },
  completed: {
    label: "Booking completed",
    detail: "This booking has already happened. Thanks for travelling with Wano!",
  },
  cancelled: {
    label: "Booking cancelled",
    detail: "This booking was cancelled and is no longer active.",
  },
};

export default async function BookingConfirmationPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return null;

  const row = await getBookingByRef(ref, travellerProfile.id);
  if (!row) notFound();
  const { booking, listing, vendor, journey } = row;
  const status = STATUS_COPY[booking.status] ?? STATUS_COPY.pending;

  return (
    <main className="mx-auto max-w-lg px-4 py-10 md:px-6">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-100 text-forest-700">
          <CheckCircleIcon className="h-8 w-8" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-semibold text-forest-900">{status.label}</h1>
        <p className="mt-1 max-w-sm text-sm text-forest-800/70">{status.detail}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-forest-900/10 bg-white p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-forest-800/50">Confirmation code</p>
        <p className="mt-1 font-mono text-3xl font-bold tracking-wider text-forest-900">{booking.bookingRef}</p>
        <div className="mt-3 flex justify-center">
          <CopyCodeButton code={booking.bookingRef} />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-forest-900/10 bg-white p-5">
        <p className="font-display text-lg font-semibold text-forest-900">{listing.title}</p>
        <p className="text-sm text-forest-800/60">
          {vendor.businessName} · {vendor.location}
        </p>
        <div className="mt-3 space-y-1 text-sm text-forest-800/80">
          {booking.visitDate && <p>Visit date: {booking.visitDate}</p>}
          {booking.partySize && <p>Party size: {booking.partySize}</p>}
          {journey && <p>Part of your {journey.name} journey</p>}
        </div>
      </div>

      <div className="mt-4">
        <BookingThread bookingId={booking.id} heading={`Message ${vendor.businessName}`} />
      </div>

      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/passport"
          className="rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700"
        >
          View all your bookings
        </Link>
        <Link
          href="/explore"
          className="rounded-full border border-forest-900/15 px-5 py-2.5 text-sm font-semibold text-forest-800 transition hover:bg-forest-900/5"
        >
          Keep exploring
        </Link>
      </div>
    </main>
  );
}
