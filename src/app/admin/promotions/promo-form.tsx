"use client";

import { useActionState } from "react";
import { createPromoCodeAction } from "@/lib/actions/promo-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

type Journey = { id: string; name: string };
type ListingOption = { id: string; title: string; businessName: string };

export function PromoForm({
  journeys,
  listingOptions,
}: {
  journeys: Journey[];
  listingOptions: ListingOption[];
}) {
  const [state, formAction, pending] = useActionState(createPromoCodeAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-forest-900/10 bg-white p-5">
      <h2 className="font-display text-lg font-semibold text-forest-900">Create a promotion</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-forest-900">Code</label>
          <input
            name="code"
            required
            placeholder="AFCON27"
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-forest-900">Title</label>
          <input
            name="title"
            required
            placeholder="Kickoff week special"
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-forest-900">Discount text</label>
        <input
          name="discountText"
          required
          placeholder="Extra 10% off any journey booking"
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-forest-900">Freebie text (optional)</label>
        <input
          name="freebieText"
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-forest-900">Scope</label>
        <select
          name="scope"
          defaultValue=""
          className="mt-1 w-full rounded-lg border border-forest-900/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest-600"
        >
          <option value="">Platform-wide (all members)</option>
          <optgroup label="Only members with a journey stamp">
            {journeys.map((j) => (
              <option key={j.id} value={`journey:${j.id}`}>
                {j.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="A specific place">
            {listingOptions.map((l) => (
              <option key={l.id} value={`listing:${l.id}`}>
                {l.title} ({l.businessName})
              </option>
            ))}
          </optgroup>
        </select>
        <p className="mt-1 text-xs text-forest-800/50">
          A place-specific promo shows only on that listing&apos;s card, everywhere it appears.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-forest-900">Expires (optional)</label>
        <input
          type="date"
          name="expiresAt"
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
        <p className="mt-1 text-xs text-forest-800/50">
          5 days before this date, the perk gets a reminder in the Social feed. Leave blank if it never expires.
        </p>
      </div>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-marigold-500 px-4 py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-marigold-400 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create promotion"}
      </button>
    </form>
  );
}
