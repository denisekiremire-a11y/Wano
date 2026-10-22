"use client";

import { useActionState } from "react";
import { createTrailAction } from "@/lib/actions/trail-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function CreateTrailForm() {
  const [state, formAction, pending] = useActionState(createTrailAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="text-sm font-medium text-ink">Name</label>
        <input
          name="name"
          required
          placeholder="Wano 40 Discoveries"
          className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Description</label>
        <textarea
          name="description"
          rows={2}
          className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Bonus XP</label>
        <input
          name="bonusXp"
          type="number"
          min={0}
          defaultValue={200}
          className="mt-1 w-32 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create trail"}
      </button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
