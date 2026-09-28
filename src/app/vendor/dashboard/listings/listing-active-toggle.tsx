"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setListingActiveAction } from "@/lib/actions/vendor-listing-actions";

export function ListingActiveToggle({ listingId, active }: { listingId: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      await setListingActiveAction(listingId, !active);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={toggle}
      className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
        active ? "bg-ink/10 text-ink" : "bg-ink/5 text-ink/40"
      }`}
      title={active ? "Visible to travellers — click to pause bookings" : "Paused — not visible to travellers"}
    >
      {active ? "Live" : "Paused"}
    </button>
  );
}
