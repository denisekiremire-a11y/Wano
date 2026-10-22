"use client";

import { useActionState } from "react";
import { attachListingToTrailAction } from "@/lib/actions/trail-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function AttachListingForm({
  trailId,
  options,
}: {
  trailId: string;
  options: { id: string; title: string; businessName: string }[];
}) {
  const [state, formAction, pending] = useActionState(attachListingToTrailAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="trailId" value={trailId} />
      <div className="min-w-0 flex-1">
        <label className="text-sm font-medium text-ink">Add a listing</label>
        <select
          name="listingId"
          required
          className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        >
          <option value="">Select a listing…</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title} — {o.businessName}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add"}
      </button>
      {state.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
