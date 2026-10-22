"use client";

import { useActionState } from "react";
import { updateTrailAction } from "@/lib/actions/trail-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function TrailDetailsForm({
  trail,
}: {
  trail: { id: string; name: string; description: string | null; bonusXp: number; active: boolean };
}) {
  const [state, formAction, pending] = useActionState(updateTrailAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="trailId" value={trail.id} />
      <div>
        <label className="text-sm font-medium text-ink">Name</label>
        <input
          name="name"
          defaultValue={trail.name}
          required
          className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Description</label>
        <textarea
          name="description"
          rows={2}
          defaultValue={trail.description ?? ""}
          className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>
      <div className="flex items-end gap-4">
        <div>
          <label className="text-sm font-medium text-ink">Bonus XP</label>
          <input
            name="bonusXp"
            type="number"
            min={0}
            defaultValue={trail.bonusXp}
            className="mt-1 w-32 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <label className="flex items-center gap-2 pb-2.5 text-sm text-ink">
          <input type="checkbox" name="active" defaultChecked={trail.active} />
          Active
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
