"use client";

import { useState } from "react";

export type PickableSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  isBlocked: boolean;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Deliberately not Intl/toLocaleDateString: this component renders during
// SSR too, and the server's Node ICU data can format the same date
// slightly differently from the browser's (e.g. a comma after the
// weekday) — a classic hydration-mismatch trap for locale-formatted dates
// in a client component. A manual, fixed format is identical everywhere.
function formatDateLabel(isoDate: string) {
  const d = new Date(`${isoDate}T00:00:00`);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Replaces a type-specific form's own free-text visitDate/visitTime
 * fields when a listing is instant-mode with slots configured — the
 * traveller picks a real slot instead of typing any date/time, and the
 * three hidden inputs here (slotId, visitDate, visitTime) are exactly
 * what bookListingFormAction/reserveSlotHold read. Capacity shown here is
 * purely informational (from the last page load); the actual reservation
 * always re-checks live under the slot's advisory lock, so a slot that
 * fills up between page load and submit is caught server-side, not here. */
export function SlotPicker({ slots }: { slots: PickableSlot[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const bookable = slots.filter((s) => !s.isBlocked);
  const byDate = new Map<string, PickableSlot[]>();
  for (const slot of bookable) {
    const list = byDate.get(slot.date) ?? [];
    list.push(slot);
    byDate.set(slot.date, list);
  }
  const selected = bookable.find((s) => s.id === selectedId) ?? null;

  if (bookable.length === 0) {
    return (
      <p className="rounded-lg border border-marigold-300 bg-marigold-50 p-3 text-sm text-marigold-900">
        No upcoming times available right now — check back soon.
      </p>
    );
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-xs font-medium text-forest-900">Pick a time</legend>
      {[...byDate.entries()].map(([date, daySlots]) => (
        <div key={date}>
          <p className="text-xs font-medium text-forest-800/60">{formatDateLabel(date)}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {daySlots.map((slot) => {
              const remaining = slot.capacity - slot.bookedCount;
              const full = remaining <= 0;
              const isSelected = selectedId === slot.id;
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={full}
                  onClick={() => setSelectedId(slot.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    isSelected
                      ? "border-forest-800 bg-forest-800 text-white"
                      : "border-forest-900/15 bg-white text-forest-900 hover:border-forest-800/40"
                  }`}
                  title={full ? "Full" : `${remaining} spot(s) left`}
                >
                  {slot.startTime.slice(0, 5)}
                  {full && " · Full"}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {selected && (
        <>
          <input type="hidden" name="slotId" value={selected.id} />
          <input type="hidden" name="visitDate" value={selected.date} />
          <input type="hidden" name="visitTime" value={selected.startTime.slice(0, 5)} />
        </>
      )}
    </fieldset>
  );
}
