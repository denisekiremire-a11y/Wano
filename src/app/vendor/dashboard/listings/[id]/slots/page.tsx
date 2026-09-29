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
    <div className="space-y-8">
      <div>
        <Link
          href={`/vendor/dashboard/listings/${listing.id}`}
          className="eyebrow text-ink/40 hover:text-ink"
        >
          ← Back to {listing.title}
        </Link>
        <h1 className="font-serif-editorial mt-3 text-2xl text-ink">Manage availability</h1>
        <p className="mt-1 text-sm text-ink/60">
          {listing.bookingMode === "instant"
            ? "Travellers pick one of these slots and get confirmed instantly, no approval needed from you."
            : "This listing is still in \"request\" mode — set up slots below, then switch it to instant from the listing page when you're ready."}
        </p>
      </div>

      <section className="border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">Add availability</h2>
        <div className="mt-3">
          <VendorSlotForm listingId={listing.id} />
        </div>
      </section>

      <section>
        <h2 className="font-serif-editorial text-lg text-ink">
          Upcoming{" "}
          {slots.length > 0 && <span className="font-mono-data text-base text-ink/40">({slots.length})</span>}
        </h2>
        {slots.length === 0 ? (
          <p className="mt-3 border border-ink/10 bg-white p-6 text-center text-sm text-ink/60">
            No upcoming slots yet — add some above.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
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
