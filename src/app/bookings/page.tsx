import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getTravellerBookings, getTravellerProfileByUserId } from "@/lib/data/traveller";

export default async function BookingsPage() {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return null;

  const bookingRows = await getTravellerBookings(travellerProfile.id);
  const upcoming = bookingRows.filter((b) => b.booking.status === "pending" || b.booking.status === "confirmed");
  const completed = bookingRows.filter((b) => b.booking.status === "completed");
  const cancelled = bookingRows.filter((b) => b.booking.status === "cancelled");

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Your bookings</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Each booking is a direct contract between you and the Wano-verified business.
        </p>
      </div>

      {bookingRows.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-forest-900/10 bg-white p-6 text-center">
          <p className="text-sm text-forest-800/60">You haven&apos;t made a booking yet.</p>
          <Link
            href="/explore"
            className="mt-3 inline-flex rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white"
          >
            Explore places
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <BookingGroup title="Upcoming" rows={upcoming} />
          <BookingGroup title="Completed" rows={completed} />
          <BookingGroup title="Cancelled" rows={cancelled} />
        </div>
      )}
    </main>
  );
}

function BookingGroup({
  title,
  rows,
}: {
  title: string;
  rows: Awaited<ReturnType<typeof getTravellerBookings>>;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-forest-900">{title}</h2>
      {[...rows].reverse().map(({ booking, listing, journey }) => (
        <div
          key={booking.id}
          className="flex items-center justify-between rounded-2xl border border-forest-900/10 bg-white p-4"
        >
          <div>
            <p className="font-medium text-forest-900">{listing.title}</p>
            <p className="text-sm text-forest-800/60">
              {journey ? `${journey.name} · ` : ""}ref {booking.bookingRef}
            </p>
          </div>
          <span className="rounded-full bg-forest-100 px-3 py-1 text-xs font-medium capitalize text-forest-800">
            {booking.status}
          </span>
        </div>
      ))}
    </section>
  );
}
