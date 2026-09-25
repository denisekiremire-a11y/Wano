"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createOneOffSlotAction, createRecurringSlotsAction } from "@/lib/actions/slot-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function OneOffForm({
  listingId,
  action = createOneOffSlotAction,
}: {
  listingId: string;
  action?: typeof createOneOffSlotAction;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      formRef.current?.reset();
      router.refresh();
    }
    wasPending.current = pending;
  }, [pending, state.error, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="listingId" value={listingId} />
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="text-xs font-medium text-forest-900">Date</label>
          <input
            type="date"
            name="date"
            required
            min={new Date().toISOString().slice(0, 10)}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-forest-900">Start</label>
          <input
            type="time"
            name="startTime"
            required
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-forest-900">End</label>
          <input
            type="time"
            name="endTime"
            required
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-forest-900">Capacity</label>
          <input
            type="number"
            name="capacity"
            min={1}
            required
            placeholder="20"
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add slot"}
      </button>
    </form>
  );
}

function RecurringForm({
  listingId,
  action = createRecurringSlotsAction,
}: {
  listingId: string;
  action?: typeof createRecurringSlotsAction;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      formRef.current?.reset();
      router.refresh();
    }
    wasPending.current = pending;
  }, [pending, state.error, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="listingId" value={listingId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-forest-900">Every</label>
          <select
            name="dayOfWeek"
            required
            defaultValue=""
            className="mt-1 w-full rounded-lg border border-forest-900/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest-600"
          >
            <option value="" disabled>
              Choose a day
            </option>
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-forest-900">Start times (comma-separated)</label>
          <input
            type="text"
            name="startTimes"
            required
            placeholder="10:00, 12:00, 14:00"
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-forest-900">Duration (minutes)</label>
          <input
            type="number"
            name="durationMinutes"
            min={15}
            required
            placeholder="60"
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-forest-900">Capacity per slot</label>
          <input
            type="number"
            name="capacity"
            min={1}
            required
            placeholder="20"
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-forest-900">Weeks ahead</label>
          <input
            type="number"
            name="weeksAhead"
            min={1}
            max={26}
            defaultValue={12}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create recurring slots"}
      </button>
    </form>
  );
}

export function VendorSlotForm({
  listingId,
  oneOffAction,
  recurringAction,
}: {
  listingId: string;
  oneOffAction?: typeof createOneOffSlotAction;
  recurringAction?: typeof createRecurringSlotsAction;
}) {
  const [tab, setTab] = useState<"one-off" | "recurring">("recurring");

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("recurring")}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            tab === "recurring" ? "bg-forest-800 text-white" : "border border-forest-900/15 text-forest-800"
          }`}
        >
          Recurring weekly
        </button>
        <button
          type="button"
          onClick={() => setTab("one-off")}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            tab === "one-off" ? "bg-forest-800 text-white" : "border border-forest-900/15 text-forest-800"
          }`}
        >
          One-off
        </button>
      </div>
      <div className="mt-4">
        {tab === "recurring" ? (
          <RecurringForm listingId={listingId} action={recurringAction} />
        ) : (
          <OneOffForm listingId={listingId} action={oneOffAction} />
        )}
      </div>
    </div>
  );
}
