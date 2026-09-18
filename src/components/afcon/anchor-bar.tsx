"use client";

import { useAnchor } from "@/components/afcon/anchor-provider";
import { STADIUM_ANCHORS } from "@/lib/afcon/anchors";

const CHIP_BASE =
  "flex-none rounded-full border px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 motion-reduce:transition-none";
const CHIP_ACTIVE = "border-forest-800 bg-forest-800 text-white";
const CHIP_INACTIVE = "border-forest-900/15 bg-white text-forest-800 hover:border-forest-900/30";

/** Sticky, horizontally scrollable anchor picker for the Journeys page —
 * stays reachable while scrolling a long list, mirrors the hero's picker
 * so switching anchor mid-browse doesn't require scrolling back up.
 * `showStadiums` gates the AFCON stadium quick-picks — off for pages (like
 * the general Journeys list) that should only offer the traveller's own
 * location, not tournament venues. */
export function AnchorBar({ showStadiums = true }: { showStadiums?: boolean }) {
  const { anchor, gpsLoading, gpsError, setStadiumAnchor, setGpsAnchor, clearAnchor } = useAnchor();

  return (
    <div className="sticky top-16 z-30 -mx-4 border-b border-forest-900/10 bg-sand-50/95 px-4 py-2.5 backdrop-blur md:-mx-6 md:px-6">
      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="flex-none text-xs font-medium uppercase tracking-wide text-forest-800/50">
          Measure from
        </span>
        {showStadiums &&
          Object.values(STADIUM_ANCHORS).map((stadium) => (
            <button
              key={stadium.id}
              type="button"
              aria-pressed={anchor?.id === stadium.id}
              onClick={() => setStadiumAnchor(stadium.id)}
              className={`${CHIP_BASE} ${anchor?.id === stadium.id ? CHIP_ACTIVE : CHIP_INACTIVE}`}
            >
              {stadium.shortLabel}
            </button>
          ))}
        <button
          type="button"
          aria-pressed={anchor?.id === "gps"}
          onClick={setGpsAnchor}
          disabled={gpsLoading}
          className={`${CHIP_BASE} ${anchor?.id === "gps" ? CHIP_ACTIVE : CHIP_INACTIVE} disabled:opacity-60`}
        >
          {gpsLoading ? "Locating…" : "My location"}
        </button>
        {anchor && (
          <button
            type="button"
            onClick={clearAnchor}
            className="flex-none text-xs font-medium text-forest-800/50 underline hover:text-forest-800"
          >
            Clear
          </button>
        )}
      </div>
      {gpsError && <p className="mt-1.5 text-xs text-red-700">{gpsError}</p>}
    </div>
  );
}
