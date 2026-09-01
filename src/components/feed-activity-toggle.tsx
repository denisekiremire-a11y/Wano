"use client";

import { useState, useTransition } from "react";
import { setFeedActivityVisibilityAction } from "@/lib/actions/profile-actions";

export function FeedActivityToggle({ initialValue }: { initialValue: boolean }) {
  const [enabled, setEnabled] = useState(initialValue);
  const [, startTransition] = useTransition();

  return (
    <label className="flex items-center justify-between rounded-xl border border-forest-900/10 bg-white p-4">
      <span>
        <span className="block text-sm font-medium text-forest-900">Show my activity in the public feed</span>
        <span className="block text-xs text-forest-800/60">
          Your reviews can appear in the Social feed. Bookings, redemptions, and saves never do, regardless
          of this setting.
        </span>
      </span>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => {
          const next = e.target.checked;
          setEnabled(next);
          startTransition(() => {
            void setFeedActivityVisibilityAction(next);
          });
        }}
        className="h-5 w-5 flex-none accent-forest-700"
      />
    </label>
  );
}
