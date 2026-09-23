import { RewardSelect } from "@/components/booking/booking-form-shell";
import { SingleItemPicker } from "@/components/booking/item-picker";
import type { ClaimedRewardRow } from "@/components/booking/types";
import { previewEventTicketAction } from "@/lib/actions/booking-actions";
import type { ListingItem } from "@/lib/data/listing-items";
import { bookingActionLabel } from "@/lib/booking-shared";

/** The event-ticket counterpart of BookingFormShell + EventBookingForm —
 * same ticket-tier + quantity picker, just posting to
 * previewEventTicketAction with an eventId instead of a listingId. */
export function EventTicketForm({
  eventId,
  items,
  itemImageIds,
  preselectedItemId,
  myClaimedRewards,
}: {
  eventId: string;
  items: ListingItem[];
  itemImageIds: Map<string, string[]>;
  preselectedItemId?: string;
  myClaimedRewards: ClaimedRewardRow[];
}) {
  return (
    <form action={previewEventTicketAction} className="max-w-md space-y-3 rounded-2xl border border-forest-900/10 bg-white p-4">
      <input type="hidden" name="eventId" value={eventId} />
      <SingleItemPicker
        items={items}
        itemImageIds={itemImageIds}
        listingType="event"
        name="selectedItemId"
        label="Ticket type"
        preselectedId={preselectedItemId}
        showQuantity
      />
      <RewardSelect myClaimedRewards={myClaimedRewards} />
      <button
        type="submit"
        className="rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700"
      >
        {bookingActionLabel.event} →
      </button>
    </form>
  );
}
