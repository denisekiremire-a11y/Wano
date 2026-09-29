import { BookingFormShell, RewardSelect } from "@/components/booking/booking-form-shell";
import { Field, TextInput, TextareaInput } from "@/components/booking/fields";
import { SingleItemPicker } from "@/components/booking/item-picker";
import type { BookingFormProps } from "@/components/booking/types";
import { bookingActionLabel } from "@/lib/booking-shared";

export function SpaSalonBookingForm({
  listingId,
  journeyId,
  items,
  itemImageIds,
  listingType,
  preselectedItemId,
  myClaimedRewards,
  slotPicker,
}: BookingFormProps) {
  return (
    <BookingFormShell listingId={listingId} journeyId={journeyId} submitLabel={bookingActionLabel.spa_salon}>
      <SingleItemPicker
        items={items}
        itemImageIds={itemImageIds}
        listingType={listingType}
        name="selectedItemId"
        label="Service"
        preselectedId={preselectedItemId}
      />
      {slotPicker ?? (
        <div className="flex gap-2">
          <Field label="Date" htmlFor="visitDate">
            <TextInput id="visitDate" type="date" name="visitDate" required />
          </Field>
          <Field label="Time" htmlFor="visitTime">
            <TextInput id="visitTime" type="time" name="visitTime" required />
          </Field>
        </div>
      )}
      <Field label="Special request (optional)" htmlFor="notes" className="block">
        <TextareaInput id="notes" name="notes" rows={2} placeholder="Allergies, stylist preference…" />
      </Field>
      <RewardSelect myClaimedRewards={myClaimedRewards} />
    </BookingFormShell>
  );
}
