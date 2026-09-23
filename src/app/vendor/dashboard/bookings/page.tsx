import { checkBirthdayEligibility, getBirthdayPerksForListings } from "@/lib/data/birthday";
import { getVendorBookings, getVendorEventTicketBookings, getVendorProfileByUserId } from "@/lib/data/vendor";
import { getSession } from "@/lib/session";
import { BookingRow } from "./booking-row";

export default async function VendorBookingsPage() {
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const [listingBookingRows, eventBookingRows] = await Promise.all([
    getVendorBookings(vendorProfile.id),
    getVendorEventTicketBookings(vendorProfile.id),
  ]);
  const perksByListing = await getBirthdayPerksForListings(listingBookingRows.map((r) => r.listing.id));

  function birthdayInfoFor(row: (typeof listingBookingRows)[number]) {
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

  const bookingRows = [
    ...listingBookingRows.map((row) => ({
      id: row.booking.id,
      booking: row.booking,
      travellerUser: row.travellerUser,
      journeyName: row.journey?.name ?? null,
      appliedReward: row.appliedReward,
      birthdayInfo: birthdayInfoFor(row),
      subjectLabel: row.listing.title,
    })),
    ...eventBookingRows.map((row) => ({
      id: row.booking.id,
      booking: row.booking,
      travellerUser: row.travellerUser,
      journeyName: null as string | null,
      appliedReward: row.appliedReward,
      birthdayInfo: null,
      subjectLabel: row.event.title,
    })),
  ].sort((a, b) => new Date(b.booking.createdAt).getTime() - new Date(a.booking.createdAt).getTime());

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
                  key={row.id}
                  bookingId={row.booking.id}
                  travellerName={row.travellerUser.name}
                  travellerEmail={row.travellerUser.email}
                  subjectLabel={row.subjectLabel}
                  journeyName={row.journeyName}
                  bookingRef={row.booking.bookingRef}
                  status={row.booking.status}
                  bookingName={row.booking.bookingName}
                  visitDate={row.booking.visitDate}
                  visitTime={row.booking.visitTime}
                  partySize={row.booking.partySize}
                  notes={row.booking.notes}
                  appliedReward={row.appliedReward}
                  birthdayInfo={row.birthdayInfo}
                />
              ))}
            </section>
          )}

          {others.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-forest-900">History</h2>
              {others.map((row) => (
                <BookingRow
                  key={row.id}
                  bookingId={row.booking.id}
                  travellerName={row.travellerUser.name}
                  travellerEmail={row.travellerUser.email}
                  subjectLabel={row.subjectLabel}
                  journeyName={row.journeyName}
                  bookingRef={row.booking.bookingRef}
                  status={row.booking.status}
                  bookingName={row.booking.bookingName}
                  visitDate={row.booking.visitDate}
                  visitTime={row.booking.visitTime}
                  partySize={row.booking.partySize}
                  notes={row.booking.notes}
                  appliedReward={row.appliedReward}
                  birthdayInfo={row.birthdayInfo}
                />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
