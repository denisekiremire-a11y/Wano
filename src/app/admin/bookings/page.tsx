import { checkBirthdayEligibility, getBirthdayPerksForListings } from "@/lib/data/birthday";
import { getAllBookings, getVendorsWithRecentCancellations } from "@/lib/data/admin";
import { requireAdminPage } from "@/lib/auth";
import { listingTypeLabels, type ListingType } from "@/lib/listing-type";
import { BookingRow } from "./booking-row";

const statusOptions = ["held", "pending", "confirmed", "completed", "cancelled", "expired"] as const;
const categoryOptions = Object.keys(listingTypeLabels) as ListingType[];

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; q?: string }>;
}) {
  await requireAdminPage("/admin/bookings");
  const { status, category, q } = await searchParams;
  const [allBookings, vendorsWithCancellations] = await Promise.all([
    getAllBookings(),
    getVendorsWithRecentCancellations(),
  ]);
  const perksByListing = await getBirthdayPerksForListings(allBookings.map((r) => r.listing.id));

  function hrefFor(overrides: { status?: string; category?: string }) {
    const params = new URLSearchParams();
    const nextStatus = "status" in overrides ? overrides.status : status;
    const nextCategory = "category" in overrides ? overrides.category : category;
    if (nextStatus) params.set("status", nextStatus);
    if (nextCategory) params.set("category", nextCategory);
    if (q) params.set("q", q);
    const qs = params.toString();
    return qs ? `/admin/bookings?${qs}` : "/admin/bookings";
  }

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
    held: allBookings.filter((b) => b.booking.status === "held").length,
    pending: allBookings.filter((b) => b.booking.status === "pending").length,
    confirmed: allBookings.filter((b) => b.booking.status === "confirmed").length,
    completed: allBookings.filter((b) => b.booking.status === "completed").length,
    cancelled: allBookings.filter((b) => b.booking.status === "cancelled").length,
    expired: allBookings.filter((b) => b.booking.status === "expired").length,
  };

  const categoryCounts = Object.fromEntries(
    categoryOptions.map((c) => [c, allBookings.filter((b) => b.listing.type === c).length]),
  ) as Record<ListingType, number>;

  const query = (q ?? "").toLowerCase().trim();
  const filtered = allBookings.filter((row) => {
    if (status && row.booking.status !== status) return false;
    if (category && row.listing.type !== category) return false;
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
        <h1 className="font-serif-editorial text-2xl text-ink">Bookings</h1>
        <p className="mt-1 text-sm text-ink/60">
          Every booking request across all businesses. Confirming or marking complete here has the
          same effect as the business doing it from their own dashboard.
        </p>
      </div>

      {vendorsWithCancellations.length > 0 && (
        <div className="border border-red-200 bg-red-50 p-4">
          <p className="eyebrow text-red-600">Vendors with recent cancellations</p>
          <ul className="mt-2 space-y-1 text-sm text-red-900">
            {vendorsWithCancellations.map((v) => (
              <li key={v.id} className="flex items-center justify-between">
                <span>{v.businessName}</span>
                <span className="font-mono-data font-semibold">{v.vendorCancellationCount} cancelled</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="eyebrow mb-2 text-ink/40">Status</p>
        <div className="grid grid-cols-3 gap-px overflow-hidden border border-ink/10 bg-ink/10 sm:grid-cols-6">
          {statusOptions.map((s) => (
            <a
              key={s}
              href={hrefFor({ status: status === s ? undefined : s })}
              className={`border-b-2 bg-white p-4 transition-colors ${
                status === s ? "border-ember" : "border-transparent hover:bg-ink/5"
              }`}
            >
              <p className={`eyebrow ${status === s ? "text-ink" : "text-ink/40"}`}>{s}</p>
              <p className="font-mono-data mt-1 text-2xl text-ink">{counts[s]}</p>
            </a>
          ))}
        </div>
      </div>

      <div>
        <p className="eyebrow mb-2 text-ink/40">Category</p>
        <div className="flex flex-wrap gap-2">
          {categoryOptions
            .filter((c) => categoryCounts[c] > 0)
            .map((c) => (
              <a
                key={c}
                href={hrefFor({ category: category === c ? undefined : c })}
                className={`border px-3 py-1.5 text-sm transition-colors ${
                  category === c
                    ? "border-ink bg-ink text-white"
                    : "border-ink/15 text-ink/70 hover:border-ink/40"
                }`}
              >
                {listingTypeLabels[c]}{" "}
                <span className="font-mono-data text-xs opacity-70">{categoryCounts[c]}</span>
              </a>
            ))}
        </div>
      </div>

      <form className="flex flex-wrap gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        {category && <input type="hidden" name="category" value={category} />}
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by traveller, business, listing, or ref..."
          className="min-w-[240px] flex-1 border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <button
          type="submit"
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/85"
        >
          Search
        </button>
        {(status || category || q) && (
          <a
            href="/admin/bookings"
            className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
          >
            Clear
          </a>
        )}
      </form>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="border border-ink/10 bg-white p-6 text-center text-sm text-ink/50">
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
              category={listingTypeLabels[row.listing.type]}
              businessName={row.vendor.businessName}
              journeyName={row.journey?.name ?? null}
              status={row.booking.status}
              commission={row.booking.estimatedCommission}
              createdAt={row.booking.createdAt.toISOString()}
              bookingName={row.booking.bookingName}
              visitDate={row.booking.visitDate}
              visitTime={row.booking.visitTime}
              partySize={row.booking.partySize}
              notes={row.booking.notes}
              appliedReward={row.appliedReward}
              birthdayInfo={birthdayInfoFor(row)}
              flaggedForSupport={row.booking.flaggedForSupport}
            />
          ))
        )}
      </div>
    </div>
  );
}
