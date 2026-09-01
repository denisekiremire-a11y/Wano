"use client";

import { useActionState } from "react";
import { applyToStartClubAction } from "@/lib/actions/club-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function ApplyClubForm({ interests }: { interests: { id: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState(applyToStartClubAction, initialState);

  if (!state.error && state !== initialState) {
    return (
      <div className="rounded-2xl border border-forest-900/10 bg-white p-6 text-center">
        <p className="text-sm font-medium text-forest-900">Application sent!</p>
        <p className="mt-1 text-sm text-forest-800/60">
          An admin will review it and be in touch using the contact info you gave.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-forest-900/10 bg-white p-5">
      <div>
        <label className="text-sm font-medium text-forest-900">Category</label>
        <select
          name="interestId"
          required
          className="mt-1 w-full rounded-lg border border-forest-900/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest-600"
        >
          <option value="">Select a category…</option>
          {interests.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-forest-900">Club name</label>
        <input
          name="name"
          required
          maxLength={100}
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-forest-900">Why this club?</label>
        <textarea
          name="why"
          required
          rows={3}
          maxLength={600}
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-forest-900">How often would you meet?</label>
        <input
          name="cadence"
          required
          placeholder="Every 2nd Saturday"
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-forest-900">Your contact (phone or email)</label>
        <input
          name="contact"
          required
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send application"}
      </button>
    </form>
  );
}
