"use client";

import { useState, useTransition } from "react";
import { setAttendeeListVisibilityAction } from "@/lib/actions/profile-actions";

export function AttendeeListPrivacyToggle({ initialValue }: { initialValue: boolean }) {
  const [hidden, setHidden] = useState(initialValue);
  const [, startTransition] = useTransition();

  return (
    <label className="flex items-center justify-between rounded-xl border border-forest-900/10 bg-white p-4">
      <span>
        <span className="block text-sm font-medium text-forest-900">Hide me from attendee lists</span>
        <span className="block text-xs text-forest-800/60">
          You stay off the &quot;Who&apos;s going&quot; avatars on events and club pages. The &quot;N going&quot;
          count still includes you.
        </span>
      </span>
      <input
        type="checkbox"
        checked={hidden}
        onChange={(e) => {
          const next = e.target.checked;
          setHidden(next);
          startTransition(() => {
            void setAttendeeListVisibilityAction(next);
          });
        }}
        className="h-5 w-5 flex-none accent-forest-700"
      />
    </label>
  );
}
