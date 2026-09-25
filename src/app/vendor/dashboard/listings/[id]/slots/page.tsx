import Link from "next/link";
import { notFound } from "next/navigation";
import { getListingSlots } from "@/lib/data/slots";
import { getVendorOwnListingFull, getVendorProfileByUserId } from "@/lib/data/vendor";
import { getSession } from "@/lib/session";
import { SlotRow } from "./slot-row";
import { VendorSlotForm } from "./vendor-slot-form";

export default async function VendorListingSlotsPage({ params }: PageProps<"/vendor/dashboard/listings/[id]/slots">) {
  const { id } = await params;
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const listingRow = await getVendorOwnListingFull(vendorProfile.id, id);
  if (!listingRow) notFound();
  const { listing } = listingRow;

  const slots = await getListingSlots(listing.id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/vendor/dashboard/listings/${listing.id}`}
          className="text-sm font-medium text-nile-700 hover:underline"
        >
          ← Back to {listing.title}
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold text-forest-900">Manage availability</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          {listing.bookingMode === "instant"
            ? "Travellers pick one of these slots and get confirmed instantly, no approval needed from you."
            : "This listing is still in \"request\" mode — set up slots below, then switch it to instant from the listing page when you're ready."}
        </p>
      </div>

      <section className="rounded-2xl border border-forest-900/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-forest-900">Add availability</h2>
        <div className="mt-3">
          <VendorSlotForm listingId={listing.id} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-forest-900">
          Upcoming {slots.length > 0 && `(${slots.length})`}
        </h2>
        {slots.length === 0 ? (
          <p className="rounded-2xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
            No upcoming slots yet — add some above.
          </p>
        ) : (
          <div className="space-y-2">
            {slots.map((slot) => (
              <SlotRow
                key={slot.id}
                slotId={slot.id}
                date={slot.date}
                startTime={slot.startTime}
                endTime={slot.endTime}
                capacity={slot.capacity}
                bookedCount={slot.bookedCount}
                isBlocked={slot.isBlocked}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
