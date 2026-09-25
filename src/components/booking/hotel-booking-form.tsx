import { BirthdayPerkBanner, BookingFormShell, RewardSelect } from "@/components/booking/booking-form-shell";
import { Field, TextInput } from "@/components/booking/fields";
import { SingleItemPicker } from "@/components/booking/item-picker";
import type { BookingFormProps } from "@/components/booking/types";
import { bookingActionLabel } from "@/lib/booking-shared";

export function HotelBookingForm({
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
    <BookingFormShell listingId={listingId} journeyId={journeyId} submitLabel={bookingActionLabel.hotel}>
      <SingleItemPicker
        items={items}
        itemImageIds={itemImageIds}
        listingType={listingType}
        name="selectedItemId"
        label="Room"
        preselectedId={preselectedItemId}
      />
      {slotPicker ?? (
        <div className="flex gap-2">
          <Field label="Check-in" htmlFor="visitDate">
            <TextInput id="visitDate" type="date" name="visitDate" required />
          </Field>
          <Field label="Check-out" htmlFor="endDate">
            <TextInput id="endDate" type="date" name="endDate" />
          </Field>
        </div>
      )}
      <div className="flex gap-2">
        <Field label="Adults" htmlFor="partySize" className="w-20">
          <TextInput id="partySize" type="number" name="partySize" min={1} defaultValue={2} required />
        </Field>
        <Field label="Children" htmlFor="childrenCount" className="w-24">
          <TextInput id="childrenCount" type="number" name="childrenCount" min={0} defaultValue={0} />
        </Field>
        <Field label="Rooms" htmlFor="roomsCount" className="w-20">
          <TextInput id="roomsCount" type="number" name="roomsCount" min={1} defaultValue={1} />
        </Field>
      </div>
      {birthdayPerks.length > 0 && <BirthdayPerkBanner title={birthdayPerks[0].title} hasBirthdaySet={hasBirthdaySet} />}
      <RewardSelect myClaimedRewards={myClaimedRewards} />
    </BookingFormShell>
  );
}
