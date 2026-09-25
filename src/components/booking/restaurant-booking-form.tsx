import { BirthdayPerkBanner, BookingFormShell, RewardSelect } from "@/components/booking/booking-form-shell";
import { Field, SelectInput, TextInput, TextareaInput } from "@/components/booking/fields";
import { PreorderPicker } from "@/components/booking/item-picker";
import type { BookingFormProps } from "@/components/booking/types";
import { bookingActionLabel } from "@/lib/booking-shared";

export function RestaurantBookingForm({
  listingId,
  journeyId,
  items,
  itemImageIds,
  listingType,
  travellerDisplayName,
  myClaimedRewards,
  birthdayPerks,
  hasBirthdaySet,
  allowsPreorder,
  slotPicker,
}: BookingFormProps) {
  return (
    <BookingFormShell listingId={listingId} journeyId={journeyId} submitLabel={bookingActionLabel.restaurant}>
      <Field label="Name for the reservation" htmlFor="bookingName" className="block">
        <TextInput id="bookingName" name="bookingName" defaultValue={travellerDisplayName} required />
      </Field>
      {slotPicker}
      <div className="flex gap-2">
        {!slotPicker && (
          <>
            <Field label="Date" htmlFor="visitDate">
              <TextInput id="visitDate" type="date" name="visitDate" required />
            </Field>
            <Field label="Time" htmlFor="visitTime">
              <TextInput id="visitTime" type="time" name="visitTime" required />
            </Field>
          </>
        )}
        <Field label="Guests" htmlFor="partySize" className="w-20">
          <TextInput id="partySize" type="number" name="partySize" min={1} defaultValue={1} required />
        </Field>
      </div>
      <div className="flex gap-2">
        <Field label="Seating" htmlFor="seatingPreference">
          <SelectInput id="seatingPreference" name="seatingPreference" defaultValue="">
            <option value="">No preference</option>
            <option value="Indoor">Indoor</option>
            <option value="Outdoor">Outdoor</option>
            <option value="Bar">Bar</option>
          </SelectInput>
        </Field>
        <Field label="Occasion" htmlFor="occasion">
          <SelectInput id="occasion" name="occasion" defaultValue="">
            <option value="">None</option>
            <option value="Birthday">Birthday</option>
            <option value="Anniversary">Anniversary</option>
            <option value="Business">Business</option>
            <option value="Casual">Casual</option>
          </SelectInput>
        </Field>
      </div>
      <Field label="Special requests (optional)" htmlFor="notes" className="block">
        <TextareaInput id="notes" name="notes" rows={2} placeholder="Allergies, accessibility, anything else…" />
      </Field>
      {allowsPreorder && <PreorderPicker items={items} itemImageIds={itemImageIds} listingType={listingType} />}
      {birthdayPerks.length > 0 && <BirthdayPerkBanner title={birthdayPerks[0].title} hasBirthdaySet={hasBirthdaySet} />}
      <RewardSelect myClaimedRewards={myClaimedRewards} />
    </BookingFormShell>
  );
}
