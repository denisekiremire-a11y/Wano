import { BookingFormShell, RewardSelect } from "@/components/booking/booking-form-shell";
import { Field, TextInput } from "@/components/booking/fields";
import { SingleItemPicker } from "@/components/booking/item-picker";
import type { BookingFormProps } from "@/components/booking/types";
import { bookingActionLabel } from "@/lib/booking-shared";

export function RentalBookingForm({
  listingId,
  journeyId,
  items,
  itemImageIds,
  listingType,
  preselectedItemId,
  myClaimedRewards,
}: BookingFormProps) {
  return (
    <BookingFormShell listingId={listingId} journeyId={journeyId} submitLabel={bookingActionLabel.rental}>
      <SingleItemPicker
        items={items}
        itemImageIds={itemImageIds}
        listingType={listingType}
        name="selectedItemId"
        label="Vehicle"
        preselectedId={preselectedItemId}
      />
      <div className="flex gap-2">
        <Field label="Pickup location" htmlFor="pickupLocation">
          <TextInput id="pickupLocation" name="pickupLocation" required />
        </Field>
        <Field label="Return location" htmlFor="dropoffLocation">
          <TextInput id="dropoffLocation" name="dropoffLocation" required />
        </Field>
      </div>
      <div className="flex gap-2">
        <Field label="Pickup date" htmlFor="visitDate">
          <TextInput id="visitDate" type="date" name="visitDate" required />
        </Field>
        <Field label="Pickup time" htmlFor="visitTime">
          <TextInput id="visitTime" type="time" name="visitTime" required />
        </Field>
      </div>
      <div className="flex gap-2">
        <Field label="Return date" htmlFor="endDate">
          <TextInput id="endDate" type="date" name="endDate" required />
        </Field>
        <Field label="Return time" htmlFor="returnTime">
          <TextInput id="returnTime" type="time" name="returnTime" />
        </Field>
      </div>
      <RewardSelect myClaimedRewards={myClaimedRewards} />
    </BookingFormShell>
  );
}
