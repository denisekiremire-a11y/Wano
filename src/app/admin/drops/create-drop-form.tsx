"use client";

import { useActionState } from "react";
import { createDropAction } from "@/lib/actions/drop-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};
const input = "mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember";

export function CreateDropForm({ venues }: { venues: { id: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState(createDropAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-ink">
          Drop date
          <input name="dropDate" type="date" required className={input} />
        </label>
        <label className="text-sm font-medium text-ink">
          Venue
          <select name="listingId" required className={input} defaultValue="">
            <option value="" disabled>
              Pick a partner listing
            </option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-ink sm:col-span-2">
          Perk
          <input name="title" required placeholder="A free mocktail or soda with any main" className={input} />
        </label>
        <label className="text-sm font-medium text-ink">
          Type
          <select name="discountType" className={input} defaultValue="freebie">
            <option value="freebie">Free item</option>
            <option value="percent">Percent off</option>
            <option value="fixed">UGX off</option>
          </select>
        </label>
        <label className="text-sm font-medium text-ink">
          Amount (for percent or UGX off)
          <input name="discountValue" inputMode="numeric" placeholder="20" className={input} />
        </label>
        <label className="text-sm font-medium text-ink">
          Spots
          <input name="cap" type="number" min={1} max={200} defaultValue={20} className={input} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium text-ink">
            Use from
            <input name="redeemFrom" type="time" defaultValue="17:00" className={input} />
          </label>
          <label className="text-sm font-medium text-ink">
            Until
            <input name="redeemUntil" type="time" defaultValue="23:00" className={input} />
          </label>
        </div>
      </div>
      <label className="block text-sm font-medium text-ink">
        Details (optional)
        <textarea
          name="description"
          rows={2}
          placeholder="One per person. Soft drink option always available; drinks 18+."
          className={input}
        />
      </label>
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Scheduling…" : "Schedule Drop"}
      </button>
    </form>
  );
}
