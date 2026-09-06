"use client";

import { useActionState } from "react";
import { createMatchAction } from "@/lib/actions/xp-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function MatchForm() {
  const [state, formAction, pending] = useActionState(createMatchAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-forest-900/10 bg-white p-5">
      <h2 className="font-display text-lg font-semibold text-forest-900">Add a match</h2>

      <div>
        <label className="text-sm font-medium text-forest-900">Title</label>
        <input
          name="title"
          required
          placeholder="Uganda vs Senegal — Group Stage"
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-forest-900">Description</label>
        <textarea
          name="description"
          required
          rows={2}
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-forest-900">Venue</label>
          <input
            name="location"
            required
            placeholder="Mandela National Stadium"
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-forest-900">Kick-off</label>
          <input
            name="startAt"
            type="datetime-local"
            required
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-forest-900">Match length (hours)</label>
        <input
          name="durationHours"
          type="number"
          min={1}
          max={6}
          defaultValue={2}
          className="mt-1 w-24 rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
        <p className="mt-1 text-xs text-forest-800/50">
          Used as the kick-off time plus this many hours — vouchers tied to this match expire then.
        </p>
      </div>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-marigold-500 px-4 py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-marigold-400 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add match"}
      </button>
    </form>
  );
}
