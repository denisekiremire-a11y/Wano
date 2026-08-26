import { checkBirthdayEligibility, getBirthdayPerksForListings } from "@/lib/data/birthday";
import { getVendorBookings, getVendorProfileByUserId } from "@/lib/data/vendor";
import { getSession } from "@/lib/session";
import { BookingRow } from "./booking-row";

export default async function VendorBookingsPage() {
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const bookingRows = await getVendorBookings(vendorProfile.id);
  const perksByListing = await getBirthdayPerksForListings(bookingRows.map((r) => r.listing.id));

  function birthdayInfoFor(row: (typeof bookingRows)[number]) {
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

  const pending = bookingRows.filter((r) => r.booking.status === "pending");
  const others = bookingRows.filter((r) => r.booking.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Booking requests</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Confirm a request once you&apos;ve checked availability — that&apos;s when the traveller&apos;s Passport
          stamp and your referral commission lock in. Decline if you can&apos;t fulfil it.
        </p>
      </div>

      {bookingRows.length === 0 ? (
        <p className="rounded-2xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
          No booking requests yet.
        </p>
      ) : (
        <>
          {pending.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-forest-900">
                Awaiting your response
              </h2>
              {pending.map((row) => (
                <BookingRow
                  key={row.booking.id}
                  bookingId={row.booking.id}
                  travellerName={row.travellerUser.name}
                  travellerEmail={row.travellerUser.email}
                  journeyName={row.journey?.name ?? null}
                  bookingRef={row.booking.bookingRef}
                  status={row.booking.status}
                  visitDate={row.booking.visitDate}
                  partySize={row.booking.partySize}
                  birthdayInfo={birthdayInfoFor(row)}
                />
              ))}
            </section>
          )}

          {others.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-forest-900">History</h2>
              {others.map((row) => (
                <BookingRow
                  key={row.booking.id}
                  bookingId={row.booking.id}
                  travellerName={row.travellerUser.name}
                  travellerEmail={row.travellerUser.email}
                  journeyName={row.journey?.name ?? null}
                  bookingRef={row.booking.bookingRef}
                  status={row.booking.status}
                  visitDate={row.booking.visitDate}
                  partySize={row.booking.partySize}
                  birthdayInfo={birthdayInfoFor(row)}
                />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
