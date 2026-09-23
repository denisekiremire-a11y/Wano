import { BookingFormShell, RewardSelect } from "@/components/booking/booking-form-shell";
import { Field, SelectInput, TextInput } from "@/components/booking/fields";
import { SingleItemPicker } from "@/components/booking/item-picker";
import type { BookingFormProps } from "@/components/booking/types";
import { bookingActionLabel } from "@/lib/booking-shared";

export function TransportBookingForm({
  listingId,
  journeyId,
  items,
  itemImageIds,
  listingType,
  preselectedItemId,
  myClaimedRewards,
}: BookingFormProps) {
  return (
    <BookingFormShell listingId={listingId} journeyId={journeyId} submitLabel={bookingActionLabel.transport}>
      <Field label="Transfer type" htmlFor="transferType" className="block">
        <SelectInput id="transferType" name="transferType" defaultValue="Airport → Hotel">
          <option value="Airport → Hotel">Airport → Hotel</option>
          <option value="Hotel → Airport">Hotel → Airport</option>
          <option value="Airport → Airport">Airport → Airport</option>
          <option value="Custom">Custom</option>
        </SelectInput>
      </Field>
      <div className="flex gap-2">
        <Field label="Pickup" htmlFor="pickupLocation">
          <TextInput id="pickupLocation" name="pickupLocation" placeholder="Entebbe Airport" required />
        </Field>
        <Field label="Drop-off" htmlFor="dropoffLocation">
          <TextInput id="dropoffLocation" name="dropoffLocation" placeholder="Kampala hotel" required />
        </Field>
      </div>
      <div className="flex gap-2">
        <Field label="Date" htmlFor="visitDate">
          <TextInput id="visitDate" type="date" name="visitDate" required />
        </Field>
        <Field label="Pickup time" htmlFor="visitTime">
          <TextInput id="visitTime" type="time" name="visitTime" required />
        </Field>
      </div>
      <div className="flex gap-2">
        <Field label="Passengers" htmlFor="partySize" className="w-24">
          <TextInput id="partySize" type="number" name="partySize" min={1} defaultValue={1} required />
        </Field>
        <Field label="Luggage" htmlFor="luggage">
          <TextInput id="luggage" name="luggage" placeholder="e.g. 2 large bags" />
        </Field>
      </div>
      <Field label="Flight number (optional)" htmlFor="flightNumber" className="block">
        <TextInput id="flightNumber" name="flightNumber" placeholder="e.g. KQ412" />
      </Field>
      <SingleItemPicker
        items={items}
        itemImageIds={itemImageIds}
        listingType={listingType}
        name="selectedItemId"
        label="Vehicle"
        preselectedId={preselectedItemId}
      />
      <RewardSelect myClaimedRewards={myClaimedRewards} />
    </BookingFormShell>
  );
}
