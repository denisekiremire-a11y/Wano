"use client";

import { useActionState } from "react";
import { createPlanAction } from "@/lib/actions/plan-actions";

const input =
  "mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-ember";

/** Make a plan. With an event, the time is the event's own; otherwise the
 * maker picks a day and time (Kampala). */
export function PlanForm({
  listingId,
  eventId,
  placeName,
  defaultDate,
}: {
  listingId?: string;
  eventId?: string;
  placeName?: string;
  defaultDate: string;
}) {
  const [state, action, pending] = useActionState(createPlanAction, undefined);
  return (
    <form action={action} className="space-y-4 border border-ink/10 bg-white p-5">
      {listingId && <input type="hidden" name="listingId" value={listingId} />}
      {eventId && <input type="hidden" name="eventId" value={eventId} />}
      <label className="block text-sm font-medium text-ink">
        Plan name
        <input name="title" placeholder={placeName ?? "Friday at Banana Bar"} maxLength={80} className={input} />
      </label>
      {!eventId && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-ink">
            Day
            <input type="date" name="date" defaultValue={defaultDate} required className={input} />
          </label>
          <label className="block text-sm font-medium text-ink">
            Time
            <input type="time" name="time" defaultValue="19:00" required className={input} />
          </label>
        </div>
      )}
      <label className="block text-sm font-medium text-ink">
        Note for friends (optional)
        <input name="note" maxLength={300} placeholder="Meet at the gate at 7" className={input} />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Making plan…" : "Make the plan"}
      </button>
    </form>
  );
}
