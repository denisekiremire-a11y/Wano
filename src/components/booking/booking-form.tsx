import { AttractionBookingForm } from "@/components/booking/attraction-booking-form";
import { EventBookingForm } from "@/components/booking/event-booking-form";
import { ExperienceBookingForm } from "@/components/booking/experience-booking-form";
import { HotelBookingForm } from "@/components/booking/hotel-booking-form";
import { RentalBookingForm } from "@/components/booking/rental-booking-form";
import { RestaurantBookingForm } from "@/components/booking/restaurant-booking-form";
import { SpaSalonBookingForm } from "@/components/booking/spa-salon-booking-form";
import { TransportBookingForm } from "@/components/booking/transport-booking-form";
import type { BookingFormProps } from "@/components/booking/types";

/** The booking screen changes shape per listing type — this just dispatches
 * to whichever type-specific form actually matches what's being booked. */
export function BookingForm(props: BookingFormProps) {
  switch (props.listingType) {
    case "restaurant":
      return <RestaurantBookingForm {...props} />;
    case "hotel":
      return <HotelBookingForm {...props} />;
    case "experience":
      return <ExperienceBookingForm {...props} />;
    case "transport":
      return <TransportBookingForm {...props} />;
    case "spa_salon":
      return <SpaSalonBookingForm {...props} />;
    case "attraction":
      return <AttractionBookingForm {...props} />;
    case "event":
      return <EventBookingForm {...props} />;
    case "rental":
      return <RentalBookingForm {...props} />;
  }
}
