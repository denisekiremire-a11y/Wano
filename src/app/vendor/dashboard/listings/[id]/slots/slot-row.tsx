"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSlotBlockedAction } from "@/lib/actions/slot-actions";

export function SlotRow({
  slotId,
  date,
  startTime,
  endTime,
  capacity,
  bookedCount,
  isBlocked,
  toggleAction = toggleSlotBlockedAction,
  subtitle,
}: {
  slotId: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  isBlocked: boolean;
  toggleAction?: typeof toggleSlotBlockedAction;
  subtitle?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      await toggleAction(slotId, !isBlocked);
      router.refresh();
    });
  }

  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
        isBlocked ? "border-forest-900/10 bg-forest-50 opacity-60" : "border-forest-900/10 bg-white"
      }`}
    >
      <div>
        <p className="text-sm font-medium text-forest-900">
          {dateLabel} · {startTime.slice(0, 5)}–{endTime.slice(0, 5)}
        </p>
        {subtitle && <p className="text-xs font-medium text-nile-700">{subtitle}</p>}
        <p className="text-xs text-forest-800/50">
          {bookedCount} / {capacity} booked{isBlocked ? " · blocked" : ""}
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={toggle}
        className={`flex-none rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
          isBlocked ? "bg-forest-800 text-white" : "border border-red-300 text-red-700 hover:bg-red-50"
        }`}
      >
        {isBlocked ? "Unblock" : "Block"}
      </button>
    </div>
  );
}
