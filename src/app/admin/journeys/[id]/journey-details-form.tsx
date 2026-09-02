"use client";

import { useActionState } from "react";
import { updateJourneyDetailsAction } from "@/lib/actions/journey-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function JourneyDetailsForm({
  journeyId,
  initial,
}: {
  journeyId: string;
  initial: {
    region: string;
    city: string;
    durationDays: string;
    budgetBand: string;
    estCostMinMinor: string;
    estCostMaxMinor: string;
    currency: string;
    bestSeason: string;
    difficulty: string;
    isFeatured: boolean;
  };
}) {
  const boundAction = updateJourneyDetailsAction.bind(null, journeyId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-forest-800/70">Region</label>
          <input
            name="region"
            defaultValue={initial.region}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-forest-800/70">City</label>
          <input
            name="city"
            defaultValue={initial.city}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-forest-800/70">Duration (days)</label>
          <input
            name="durationDays"
            type="number"
            min={1}
            defaultValue={initial.durationDays}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-forest-800/70">Budget band</label>
          <select
            name="budgetBand"
            defaultValue={initial.budgetBand}
            className="mt-1 w-full rounded-lg border border-forest-900/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest-600"
          >
            <option value="">— Not set —</option>
            <option value="budget">Budget</option>
            <option value="mid">Mid</option>
            <option value="premium">Premium</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-forest-800/70">Cost min</label>
          <input
            name="estCostMinMinor"
            type="number"
            min={0}
            defaultValue={initial.estCostMinMinor}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-forest-800/70">Cost max</label>
          <input
            name="estCostMaxMinor"
            type="number"
            min={0}
            defaultValue={initial.estCostMaxMinor}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-forest-800/70">Currency</label>
          <input
            name="currency"
            defaultValue={initial.currency}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-forest-800/70">Best season</label>
          <input
            name="bestSeason"
            defaultValue={initial.bestSeason}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-forest-800/70">Difficulty</label>
          <input
            name="difficulty"
            defaultValue={initial.difficulty}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-forest-800">
          <input type="checkbox" name="isFeatured" defaultChecked={initial.isFeatured} />
          Featured
        </label>
      </div>
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-forest-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}
