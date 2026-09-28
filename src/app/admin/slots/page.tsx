import { adminCreateOneOffSlotAction, adminCreateRecurringSlotsAction, adminToggleSlotBlockedAction } from "@/lib/actions/slot-actions";
import { getAllListingsForAdmin } from "@/lib/data/admin";
import { getAllUpcomingSlots, getListingSlots } from "@/lib/data/slots";
import { requireAdminPage } from "@/lib/auth";
import { SlotRow } from "@/app/vendor/dashboard/listings/[id]/slots/slot-row";
import { VendorSlotForm } from "@/app/vendor/dashboard/listings/[id]/slots/vendor-slot-form";
import { ListingPicker } from "./listing-picker";

export default async function AdminSlotsPage({
  searchParams,
}: {
  searchParams: Promise<{ listingId?: string }>;
}) {
  await requireAdminPage("/admin/slots");
  const { listingId } = await searchParams;
  const [listingOptions, allUpcoming] = await Promise.all([getAllListingsForAdmin(), getAllUpcomingSlots()]);
  const selected = listingId ? listingOptions.find((l) => l.listing.id === listingId) : undefined;
  const selectedSlots = listingId ? await getListingSlots(listingId) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink">Slots</h1>
        <p className="mt-1 text-sm text-ink/60">
          Create, edit, or block availability for any business — same effect as them doing it from their own
          dashboard.
        </p>
      </div>

      <ListingPicker
        listings={listingOptions.map((l) => ({ id: l.listing.id, title: l.listing.title, businessName: l.vendor.businessName }))}
        selectedListingId={listingId}
      />

      {selected && (
        <section className="border border-ink/10 bg-white p-5">
          <h2 className="font-serif-editorial text-lg text-ink">
            Add availability — {selected.listing.title}
          </h2>
          <div className="mt-3">
            <VendorSlotForm
              listingId={selected.listing.id}
              oneOffAction={adminCreateOneOffSlotAction}
              recurringAction={adminCreateRecurringSlotsAction}
            />
          </div>
          <div className="mt-5 space-y-2 border-t border-ink/10 pt-4">
            {selectedSlots.length === 0 ? (
              <p className="text-sm text-ink/60">No upcoming slots for this listing yet.</p>
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
        <h2 className="font-serif-editorial text-lg text-ink">
          All upcoming slots{" "}
          {allUpcoming.length > 0 && <span className="font-mono-data text-base text-ink/40">({allUpcoming.length})</span>}
        </h2>
        {allUpcoming.length === 0 ? (
          <p className="border border-ink/10 bg-white p-6 text-center text-sm text-ink/60">
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
