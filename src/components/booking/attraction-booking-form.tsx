import { BookingFormShell, RewardSelect } from "@/components/booking/booking-form-shell";
import { Field, TextInput, TextareaInput } from "@/components/booking/fields";
import { SingleItemPicker } from "@/components/booking/item-picker";
import type { BookingFormProps } from "@/components/booking/types";
import { bookingActionLabel } from "@/lib/booking-shared";

export function AttractionBookingForm({
  listingId,
  journeyId,
  items,
  itemImageIds,
  listingType,
  preselectedItemId,
  myClaimedRewards,
}: BookingFormProps) {
  return (
    <BookingFormShell listingId={listingId} journeyId={journeyId} submitLabel={bookingActionLabel.attraction}>
      <div className="flex gap-2">
        <Field label="Date" htmlFor="visitDate">
          <TextInput id="visitDate" type="date" name="visitDate" required />
        </Field>
        <Field label="Time" htmlFor="visitTime">
          <TextInput id="visitTime" type="time" name="visitTime" required />
        </Field>
      </div>
      <div className="flex gap-2">
        <Field label="Adults" htmlFor="partySize" className="w-20">
          <TextInput id="partySize" type="number" name="partySize" min={1} defaultValue={1} required />
        </Field>
        <Field label="Children" htmlFor="childrenCount" className="w-24">
          <TextInput id="childrenCount" type="number" name="childrenCount" min={0} defaultValue={0} />
        </Field>
        <Field label="Language (optional)" htmlFor="language">
          <TextInput id="language" name="language" placeholder="English" />
        </Field>
      </div>
      <Field label="Meeting point (optional)" htmlFor="meetingPoint" className="block">
        <TextInput id="meetingPoint" name="meetingPoint" placeholder="Where should we meet?" />
      </Field>
      {items.length > 0 && (
        <SingleItemPicker
          items={items}
          itemImageIds={itemImageIds}
          listingType={listingType}
          name="selectedItemId"
          label="Choose an option"
          preselectedId={preselectedItemId}
        />
      )}
      <Field label="Special requests (optional)" htmlFor="notes" className="block">
        <TextareaInput id="notes" name="notes" rows={2} />
      </Field>
      <RewardSelect myClaimedRewards={myClaimedRewards} />
    </BookingFormShell>
  );
}
