import { checkBirthdayEligibility, getBirthdayPerksForListings } from "@/lib/data/birthday";
import { getAllBookings } from "@/lib/data/admin";
import { BookingRow } from "./booking-row";

const statusOptions = ["pending", "confirmed", "completed", "cancelled"] as const;

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const allBookings = await getAllBookings();
  const perksByListing = await getBirthdayPerksForListings(allBookings.map((r) => r.listing.id));

  function birthdayInfoFor(row: (typeof allBookings)[number]) {
    const perks = perksByListing.get(row.listing.id) ?? [];
    if (perks.length === 0 || (!row.booking.visitDate && !row.booking.partySize)) return null;
    const perk = perks[0];
    const { eligible, reason } = checkBirthdayEligibility(
      row.traveller.dateOfBirth,
      row.booking.visitDate,
      row.booking.partySize,
      perk.minPartySize,
    );
    return { perkTitle: perk.title, eligible, reason };
  }

  const counts = {
    pending: allBookings.filter((b) => b.booking.status === "pending").length,
    confirmed: allBookings.filter((b) => b.booking.status === "confirmed").length,
    completed: allBookings.filter((b) => b.booking.status === "completed").length,
    cancelled: allBookings.filter((b) => b.booking.status === "cancelled").length,
  };

  const query = (q ?? "").toLowerCase().trim();
  const filtered = allBookings.filter((row) => {
    if (status && row.booking.status !== status) return false;
    if (!query) return true;
    return (
      row.travellerUser.name.toLowerCase().includes(query) ||
      row.travellerUser.email.toLowerCase().includes(query) ||
      row.vendor.businessName.toLowerCase().includes(query) ||
      row.listing.title.toLowerCase().includes(query) ||
      row.booking.bookingRef.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Bookings</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Every booking request across all businesses. Confirming or marking complete here has the
          same effect as the business doing it from their own dashboard.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statusOptions.map((s) => (
          <a
            key={s}
            href={`/admin/bookings?status=${s}`}
            className={`rounded-2xl border p-4 transition hover:shadow-md ${
              status === s ? "border-forest-800 bg-forest-50" : "border-forest-900/10 bg-white"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-forest-800/50 capitalize">{s}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-forest-900">{counts[s]}</p>
          </a>
        ))}
      </div>

      <form className="flex flex-wrap gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by traveller, business, listing, or ref..."
          className="min-w-[240px] flex-1 rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
        <button
          type="submit"
          className="rounded-lg bg-forest-800 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700"
        >
          Search
        </button>
        {(status || q) && (
          <a
            href="/admin/bookings"
            className="rounded-lg border border-forest-900/15 px-4 py-2 text-sm font-semibold text-forest-800 hover:bg-forest-800/5"
          >
            Clear
          </a>
        )}
      </form>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
            No bookings match.
          </p>
        ) : (
          filtered.map((row) => (
            <BookingRow
              key={row.booking.id}
              bookingId={row.booking.id}
              bookingRef={row.booking.bookingRef}
              travellerName={row.travellerUser.name}
              travellerEmail={row.travellerUser.email}
              listingTitle={row.listing.title}
              businessName={row.vendor.businessName}
              journeyName={row.journey?.name ?? null}
              status={row.booking.status}
              commission={row.booking.estimatedCommission}
              createdAt={row.booking.createdAt.toISOString()}
              visitDate={row.booking.visitDate}
              partySize={row.booking.partySize}
              birthdayInfo={birthdayInfoFor(row)}
            />
          ))
        )}
      </div>
    </div>
  );
}
