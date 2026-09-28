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

  // Built manually rather than via toLocaleDateString: "en-GB" weekday+day+month
  // formatting disagrees on comma placement between Node's server-side ICU and
  // browser ICU, which was causing a hydration mismatch on this exact string.
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parsedDate = new Date(`${date}T00:00:00`);
  const dateLabel = `${WEEKDAYS[parsedDate.getDay()]} ${parsedDate.getDate()} ${MONTHS[parsedDate.getMonth()]}`;

  return (
    <div
      className={`flex items-center justify-between gap-3 border p-3 ${
        isBlocked ? "border-ink/10 bg-ink/5 opacity-60" : "border-ink/10 bg-white"
      }`}
    >
      <div>
        <p className="font-mono-data text-sm font-medium text-ink">
          {dateLabel} · {startTime.slice(0, 5)}–{endTime.slice(0, 5)}
        </p>
        {subtitle && <p className="eyebrow text-ember">{subtitle}</p>}
        <p className="font-mono-data text-xs text-ink/40">
          {bookedCount} / {capacity} booked{isBlocked ? " · blocked" : ""}
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={toggle}
        className={`flex-none rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
          isBlocked ? "bg-ink text-white hover:bg-ink/85" : "border border-red-300 text-red-700 hover:bg-red-50"
        }`}
      >
        {isBlocked ? "Unblock" : "Block"}
      </button>
    </div>
  );
}
