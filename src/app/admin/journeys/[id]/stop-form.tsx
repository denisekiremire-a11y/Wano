"use client";

import { useActionState, useState } from "react";
import { addStopAction } from "@/lib/actions/journey-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function StopForm({
  journeyId,
  listingOptions,
}: {
  journeyId: string;
  listingOptions: { id: string; title: string; vendorName: string }[];
}) {
  const boundAction = addStopAction.bind(null, journeyId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [mode, setMode] = useState<"listing" | "custom">("listing");

  return (
    <form action={formAction} className="space-y-3 border border-dashed border-ink/20 p-4">
      <p className="eyebrow text-ink/40">Add a stop</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-ink/70">Day</label>
          <input
            name="dayNumber"
            type="number"
            min={1}
            defaultValue={1}
            required
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink/70">Order</label>
          <input
            name="orderIndex"
            type="number"
            min={0}
            defaultValue={0}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink/70">Type</label>
          <select
            name="stopType"
            defaultValue="do"
            className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ember"
          >
            <option value="stay">Stay</option>
            <option value="do">Do</option>
            <option value="eat">Eat</option>
            <option value="move">Move</option>
            <option value="rest">Rest</option>
          </select>
        </div>
      </div>

      <div className="flex gap-4 border-b border-ink/10 text-xs">
        <button
          type="button"
          onClick={() => setMode("listing")}
          className={`eyebrow border-b-2 pb-2 ${mode === "listing" ? "border-ember text-ink" : "border-transparent text-ink/40"}`}
        >
          Real listing
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={`eyebrow border-b-2 pb-2 ${mode === "custom" ? "border-ember text-ink" : "border-transparent text-ink/40"}`}
        >
          Custom place (not on Wano yet)
        </button>
      </div>

      {mode === "listing" ? (
        <div>
          <label className="text-xs font-medium text-ink/70">Listing</label>
          <select
            name="listingId"
            className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ember"
          >
            <option value="">— Choose a listing —</option>
            {listingOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title} ({l.vendorName})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-ink/70">Place name</label>
            <input
              name="customName"
              className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink/70">Address</label>
            <input
              name="customAddress"
              className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
            />
          </div>
          <p className="sm:col-span-2 text-[11px] text-ink/40">
            This creates a supply lead for ops — a real place someone will want to book that Wano
            doesn&apos;t list yet.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-ink/70">Note</label>
          <input
            name="note"
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-ink/70">Minutes</label>
            <input
              name="durationMinutes"
              type="number"
              min={0}
              className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink/70">Est. cost</label>
            <input
              name="estCostMinor"
              type="number"
              min={0}
              className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
            />
          </div>
        </div>
      </div>

      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add stop"}
      </button>
    </form>
  );
}
