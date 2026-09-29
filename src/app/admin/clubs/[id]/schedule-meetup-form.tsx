"use client";

import { useActionState } from "react";
import { createEventAction } from "@/lib/actions/event-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function ScheduleMeetupForm({ clubId, defaultCategory }: { clubId: string; defaultCategory: string }) {
  const [state, formAction, pending] = useActionState(createEventAction, initialState);

  return (
    <form action={formAction} className="space-y-3 border-t border-ink/10 pt-4">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="category" value={defaultCategory} />
      <p className="eyebrow text-ink/40">Schedule a meetup</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="title"
          required
          placeholder="Meetup title"
          className="rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
        <input
          name="startAt"
          type="datetime-local"
          required
          className="rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
        <input
          name="location"
          required
          placeholder="Location"
          className="rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
        <input
          name="priceHint"
          placeholder="Free to attend (optional)"
          className="rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>
      <textarea
        name="description"
        required
        rows={2}
        placeholder="What happens at this meetup?"
        className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
      />
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-ink/20 px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-ink/5 disabled:opacity-60"
      >
        {pending ? "Scheduling…" : "Schedule meetup"}
      </button>
    </form>
  );
}
