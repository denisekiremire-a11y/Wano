import { BirthdayPerkBanner, BookingFormShell, RewardSelect } from "@/components/booking/booking-form-shell";
import { Field, SelectInput, TextInput, TextareaInput } from "@/components/booking/fields";
import { SingleItemPicker } from "@/components/booking/item-picker";
import type { BookingFormProps } from "@/components/booking/types";
import { bookingActionLabel } from "@/lib/booking-shared";

export function ExperienceBookingForm({
  listingId,
  journeyId,
  items,
  itemImageIds,
  listingType,
  preselectedItemId,
  myClaimedRewards,
  birthdayPerks,
  hasBirthdaySet,
  slotPicker,
}: BookingFormProps) {
  return (
    <BookingFormShell listingId={listingId} journeyId={journeyId} submitLabel={bookingActionLabel.experience}>
      {items.length > 0 && (
        <SingleItemPicker
          items={items}
          itemImageIds={itemImageIds}
          listingType={listingType}
          name="selectedItemId"
          label="Choose package"
          preselectedId={preselectedItemId}
        />
      )}
      {slotPicker ?? (
        <div className="flex gap-2">
          <Field label="From date" htmlFor="visitDate">
            <TextInput id="visitDate" type="date" name="visitDate" required />
          </Field>
          <Field label="To date" htmlFor="endDate">
            <TextInput id="endDate" type="date" name="endDate" />
          </Field>
        </div>
      )}
      <div className="flex gap-2">
        <Field label="Adults" htmlFor="partySize" className="w-20">
          <TextInput id="partySize" type="number" name="partySize" min={1} defaultValue={1} required />
        </Field>
        <Field label="Children" htmlFor="childrenCount" className="w-24">
          <TextInput id="childrenCount" type="number" name="childrenCount" min={0} defaultValue={0} />
        </Field>
        <Field label="Pickup" htmlFor="pickupOption">
          <SelectInput id="pickupOption" name="pickupOption" defaultValue="">
            <option value="">Not needed</option>
            <option value="Yes, arrange pickup">Yes, arrange pickup</option>
          </SelectInput>
        </Field>
      </div>
      <Field label="Special requests (optional)" htmlFor="notes" className="block">
        <TextareaInput id="notes" name="notes" rows={2} placeholder="Dietary needs, mobility, anything else…" />
      </Field>
      {birthdayPerks.length > 0 && <BirthdayPerkBanner title={birthdayPerks[0].title} hasBirthdaySet={hasBirthdaySet} />}
      <RewardSelect myClaimedRewards={myClaimedRewards} />
    </BookingFormShell>
  );
}
