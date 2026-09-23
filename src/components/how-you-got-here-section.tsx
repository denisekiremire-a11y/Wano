"use client";

import { useState } from "react";
import { CheckIcon, StampIcon, StarIcon, TrophyIcon, UsersIcon } from "@/components/icons";

const BREAKDOWN_ICONS: Record<string, (props: { className?: string }) => React.ReactElement> = {
  "Passport stamps": StampIcon,
  "Challenges completed": TrophyIcon,
  "Reviews written": StarIcon,
  "Friends referred": UsersIcon,
  "Profile complete": CheckIcon,
};

type BreakdownRow = { label: string; count: number; points: number };

/** Collapsed by default — the points-shop redeem catalog is the primary
 * content of the Rewards tab now, so the earn-side breakdown (still handy
 * for "why do I have this many points") stays one tap away instead of
 * taking up the top of the page. Same collapse pattern as
 * PastVouchersSection. */
export function HowYouGotHereSection({ breakdown, pendingReferrals }: { breakdown: BreakdownRow[]; pendingReferrals: number }) {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-forest-900/10 bg-white p-3 text-left"
      >
        <span className="font-display text-sm font-semibold text-forest-900">How you got here</span>
        <span className="text-xs font-medium text-nile-700">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {breakdown.map((row) => {
              const Icon = BREAKDOWN_ICONS[row.label] ?? StarIcon;
              return (
                <div key={row.label} className="rounded-xl border border-forest-900/10 bg-white p-3">
                  <Icon className="h-4 w-4 text-forest-800/50" />
                  <p className="mt-1.5 text-sm font-medium text-forest-900">{row.label}</p>
                  <div className="mt-0.5 flex items-baseline justify-between">
                    <p className="text-xs text-forest-800/50">{row.count}</p>
                    <span className="text-xs font-semibold text-forest-800">+{row.points} pts</span>
                  </div>
                </div>
              );
            })}
          </div>
          {pendingReferrals > 0 && (
            <p className="text-xs text-forest-800/50">
              +{pendingReferrals} more referral{pendingReferrals === 1 ? "" : "s"} pending — lands once they confirm
              their first booking.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
