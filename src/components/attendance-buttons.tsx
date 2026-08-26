"use client";

import { useOptimistic, useTransition } from "react";
import { setAttendanceAction, type AttendanceStatus } from "@/lib/actions/event-actions";

const OPTIONS: { status: AttendanceStatus; label: string }[] = [
  { status: "going", label: "Going" },
  { status: "interested", label: "Interested" },
  { status: "maybe", label: "Maybe" },
];

export function AttendanceButtons({
  eventId,
  initialStatus,
}: {
  eventId: string;
  initialStatus: AttendanceStatus | null;
}) {
  const [status, setOptimisticStatus] = useOptimistic(initialStatus);
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((opt) => {
        const active = status === opt.status;
        return (
          <button
            key={opt.status}
            type="button"
            onClick={() =>
              startTransition(async () => {
                setOptimisticStatus(active ? null : opt.status);
                await setAttendanceAction(eventId, opt.status);
              })
            }
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-forest-800 text-white"
                : "border border-forest-800/20 text-forest-800 hover:bg-forest-800/5"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
