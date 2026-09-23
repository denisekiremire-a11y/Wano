import { RewardSelect } from "@/components/booking/booking-form-shell";
import { Field, TextInput, TextareaInput } from "@/components/booking/fields";
import { SingleItemPicker } from "@/components/booking/item-picker";
import type { ClaimedRewardRow } from "@/components/booking/types";
import { previewEventTicketAction } from "@/lib/actions/booking-actions";
import type { ListingItem } from "@/lib/data/listing-items";

/** The booking form every standalone event gets — party size, name, and
 * notes are the required core (the event's own date/time is fixed, so
 * there's nothing to pick there); a ticket-tier selection only appears,
 * and stays optional, when the organizer has configured one. Posts to
 * previewEventTicketAction with an eventId instead of a listingId. */
export function EventTicketForm({
  eventId,
  items,
  itemImageIds,
  preselectedItemId,
  travellerDisplayName,
  myClaimedRewards,
}: {
  eventId: string;
  items: ListingItem[];
  itemImageIds: Map<string, string[]>;
  preselectedItemId?: string;
  travellerDisplayName: string;
  myClaimedRewards: ClaimedRewardRow[];
}) {
  return (
    <form action={previewEventTicketAction} className="max-w-md space-y-3 rounded-2xl border border-forest-900/10 bg-white p-4">
      <input type="hidden" name="eventId" value={eventId} />

      <Field label="Name for the booking" htmlFor="bookingName" className="block">
        <TextInput id="bookingName" name="bookingName" defaultValue={travellerDisplayName} required />
      </Field>

      <div className="flex gap-2">
        <Field label="Adults" htmlFor="partySize" className="w-20">
          <TextInput id="partySize" type="number" name="partySize" min={1} defaultValue={1} required />
        </Field>
        <Field label="Children" htmlFor="childrenCount" className="w-24">
          <TextInput id="childrenCount" type="number" name="childrenCount" min={0} defaultValue={0} />
        </Field>
      </div>

      {items.length > 0 && (
        <SingleItemPicker
          items={items}
          itemImageIds={itemImageIds}
          listingType="event"
          name="selectedItemId"
          label="Ticket type"
          preselectedId={preselectedItemId}
          showQuantity
          required={false}
        />
      )}

      <Field label="Special requests (optional)" htmlFor="notes" className="block">
        <TextareaInput id="notes" name="notes" rows={2} />
      </Field>

      <RewardSelect myClaimedRewards={myClaimedRewards} />
      <button
        type="submit"
        className="rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700"
      >
        Book →
      </button>
    </form>
  );
}
