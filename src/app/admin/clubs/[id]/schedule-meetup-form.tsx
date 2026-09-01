"use client";

import { useActionState } from "react";
import { createEventAction } from "@/lib/actions/event-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function ScheduleMeetupForm({ clubId, defaultCategory }: { clubId: string; defaultCategory: string }) {
  const [state, formAction, pending] = useActionState(createEventAction, initialState);

  return (
    <form action={formAction} className="space-y-3 border-t border-forest-900/10 pt-4">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="category" value={defaultCategory} />
      <p className="text-xs font-semibold text-forest-900">Schedule a meetup</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="title"
          required
          placeholder="Meetup title"
          className="rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
        <input
          name="startAt"
          type="datetime-local"
          required
          className="rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
        <input
          name="location"
          required
          placeholder="Location"
          className="rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
        <input
          name="priceHint"
          placeholder="Free to attend (optional)"
          className="rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
      </div>
      <textarea
        name="description"
        required
        rows={2}
        placeholder="What happens at this meetup?"
        className="w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
      />
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-forest-900/15 px-4 py-2 text-xs font-semibold text-forest-800 hover:bg-forest-50 disabled:opacity-60"
      >
        {pending ? "Scheduling…" : "Schedule meetup"}
      </button>
    </form>
  );
}
