"use client";

import { useActionState } from "react";
import { submitClubAction } from "@/lib/actions/club-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function ClubForm({ interests }: { interests: { id: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState(submitClubAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-forest-900/10 bg-white p-5">
      <div>
        <label htmlFor="name" className="text-sm font-medium text-forest-900">
          Club name
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={100}
          placeholder="e.g. Nile Adventurers"
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
      </div>
      <div>
        <label htmlFor="interestId" className="text-sm font-medium text-forest-900">
          Category
        </label>
        <select
          id="interestId"
          name="interestId"
          required
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        >
          <option value="">Select a category…</option>
          {interests.map((interest) => (
            <option key={interest.id} value={interest.id}>
              {interest.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="description" className="text-sm font-medium text-forest-900">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          maxLength={600}
          placeholder="What's this club about, and who should join?"
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
      </div>
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit club for review"}
      </button>
    </form>
  );
}
