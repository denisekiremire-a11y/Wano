"use client";

import { useActionState } from "react";
import { addPointsAdjustmentAction } from "@/lib/actions/points-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function AdjustmentForm({ travellerId }: { travellerId: string }) {
  const [state, formAction, pending] = useActionState(addPointsAdjustmentAction, initialState);

  return (
    <form action={formAction} className="space-y-3 border border-ink/10 bg-white p-4">
      <input type="hidden" name="travellerId" value={travellerId} />
      <h3 className="text-sm font-semibold text-ink">Manual adjustment</h3>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-sm font-medium text-ink">Points (+/-)</label>
          <input
            name="delta"
            type="number"
            required
            placeholder="e.g. 150 or -50"
            className="mt-1 w-32 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <div className="min-w-[16rem] flex-1">
          <label className="text-sm font-medium text-ink">Reason (required)</label>
          <input
            name="reason"
            required
            placeholder="Why is this adjustment being made?"
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add adjustment"}
        </button>
      </div>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
