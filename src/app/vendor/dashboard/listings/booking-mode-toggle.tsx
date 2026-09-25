"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setListingBookingModeAction } from "@/lib/actions/vendor-listing-actions";

export function BookingModeToggle({
  listingId,
  bookingMode,
}: {
  listingId: string;
  bookingMode: "instant" | "request";
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const instant = bookingMode === "instant";

  function toggle() {
    startTransition(async () => {
      await setListingBookingModeAction(listingId, instant ? "request" : "instant");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={toggle}
      className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
        instant ? "bg-forest-100 text-forest-800" : "bg-marigold-100 text-marigold-800"
      }`}
      title={
        instant
          ? "Bookings confirm instantly against your slot capacity — click to switch to manual approval"
          : "You approve each booking request yourself — click to switch to instant confirmation (set up slots first)"
      }
    >
      {instant ? "Instant booking" : "Request booking"}
    </button>
  );
}
