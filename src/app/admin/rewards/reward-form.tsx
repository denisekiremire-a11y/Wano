"use client";

import { useActionState } from "react";
import { createRewardAction } from "@/lib/actions/reward-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function RewardForm() {
  const [state, formAction, pending] = useActionState(createRewardAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-forest-900/10 bg-white p-5">
      <h2 className="font-display text-lg font-semibold text-forest-900">Add a reward</h2>

      <div>
        <label className="text-sm font-medium text-forest-900">Title</label>
        <input
          name="title"
          required
          placeholder="Free airport pickup"
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-forest-900">Description</label>
        <textarea
          name="description"
          required
          rows={2}
          placeholder="Redeem for a complimentary pickup on your next journey."
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-forest-900">Points cost</label>
          <input
            name="pointsCost"
            type="number"
            min={1}
            required
            placeholder="500"
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-forest-900">Stock (optional)</label>
          <input
            name="stock"
            type="number"
            min={0}
            placeholder="Leave blank for unlimited"
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-marigold-500 px-4 py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-marigold-400 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add reward"}
      </button>
    </form>
  );
}
