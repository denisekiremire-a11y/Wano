import { adminCreateOneOffSlotAction, adminCreateRecurringSlotsAction, adminToggleSlotBlockedAction } from "@/lib/actions/slot-actions";
import { getAllListingsForAdmin } from "@/lib/data/admin";
import { getAllUpcomingSlots, getListingSlots } from "@/lib/data/slots";
import { SlotRow } from "@/app/vendor/dashboard/listings/[id]/slots/slot-row";
import { VendorSlotForm } from "@/app/vendor/dashboard/listings/[id]/slots/vendor-slot-form";
import { ListingPicker } from "./listing-picker";

export default async function AdminSlotsPage({
  searchParams,
}: {
  searchParams: Promise<{ listingId?: string }>;
}) {
  const { listingId } = await searchParams;
  const [listingOptions, allUpcoming] = await Promise.all([getAllListingsForAdmin(), getAllUpcomingSlots()]);
  const selected = listingId ? listingOptions.find((l) => l.listing.id === listingId) : undefined;
  const selectedSlots = listingId ? await getListingSlots(listingId) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Slots</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Create, edit, or block availability for any business — same effect as them doing it from their own
          dashboard.
        </p>
      </div>

      <ListingPicker
        listings={listingOptions.map((l) => ({ id: l.listing.id, title: l.listing.title, businessName: l.vendor.businessName }))}
        selectedListingId={listingId}
      />

      {selected && (
        <section className="rounded-2xl border border-forest-900/10 bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-forest-900">
            Add availability — {selected.listing.title}
          </h2>
          <div className="mt-3">
            <VendorSlotForm
              listingId={selected.listing.id}
              oneOffAction={adminCreateOneOffSlotAction}
              recurringAction={adminCreateRecurringSlotsAction}
            />
          </div>
          <div className="mt-5 space-y-2 border-t border-forest-900/10 pt-4">
            {selectedSlots.length === 0 ? (
              <p className="text-sm text-forest-800/60">No upcoming slots for this listing yet.</p>
            ) : (
              selectedSlots.map((slot) => (
                <SlotRow
                  key={slot.id}
                  slotId={slot.id}
                  date={slot.date}
                  startTime={slot.startTime}
                  endTime={slot.endTime}
                  capacity={slot.capacity}
                  bookedCount={slot.bookedCount}
                  isBlocked={slot.isBlocked}
                  toggleAction={adminToggleSlotBlockedAction}
                />
              ))
            )}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-forest-900">
          All upcoming slots {allUpcoming.length > 0 && `(${allUpcoming.length})`}
        </h2>
        {allUpcoming.length === 0 ? (
          <p className="rounded-2xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
            No slots set up anywhere yet.
          </p>
        ) : (
          <div className="space-y-2">
            {allUpcoming.map((row) => (
              <SlotRow
                key={row.slot.id}
                slotId={row.slot.id}
                date={row.slot.date}
                startTime={row.slot.startTime}
                endTime={row.slot.endTime}
                capacity={row.slot.capacity}
                bookedCount={row.slot.bookedCount}
                isBlocked={row.slot.isBlocked}
                toggleAction={adminToggleSlotBlockedAction}
                subtitle={`${row.listingTitle} · ${row.vendorBusinessName}`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
