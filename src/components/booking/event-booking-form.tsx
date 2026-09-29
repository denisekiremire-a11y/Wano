import { BookingFormShell, RewardSelect } from "@/components/booking/booking-form-shell";
import { SingleItemPicker } from "@/components/booking/item-picker";
import type { BookingFormProps } from "@/components/booking/types";
import { bookingActionLabel } from "@/lib/booking-shared";

export function EventBookingForm({
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
    <BookingFormShell listingId={listingId} journeyId={journeyId} submitLabel={bookingActionLabel.event}>
      {slotPicker}
      <SingleItemPicker
        items={items}
        itemImageIds={itemImageIds}
        listingType={listingType}
        name="selectedItemId"
        label="Ticket type"
        preselectedId={preselectedItemId}
        showQuantity
      />
      <RewardSelect myClaimedRewards={myClaimedRewards} />
    </BookingFormShell>
  );
}
