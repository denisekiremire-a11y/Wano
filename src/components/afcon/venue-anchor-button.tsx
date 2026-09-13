"use client";

import { useAnchor } from "@/components/afcon/anchor-provider";
import type { StadiumAnchorId } from "@/lib/afcon/anchors";

/** This venue page's own listings are always relative to its one fixed
 * stadium — they don't need the global anchor to render. This button just
 * offers to carry that choice over to the rest of the site (Journeys,
 * Explore) for whoever wants to keep planning from here. */
export function VenueAnchorButton({ venueId, label }: { venueId: StadiumAnchorId; label: string }) {
  const { anchor, setStadiumAnchor } = useAnchor();
  const isSet = anchor?.id === venueId;

  return (
    <button
      type="button"
      aria-pressed={isSet}
      onClick={() => setStadiumAnchor(venueId)}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marigold-300 ${
        isSet
          ? "border-marigold-300 bg-marigold-300/15 text-marigold-200"
          : "border-white/25 text-white hover:bg-white/10"
      }`}
    >
      {isSet ? `✓ Measuring from ${label}` : `Measure trips from ${label}`}
    </button>
  );
}
