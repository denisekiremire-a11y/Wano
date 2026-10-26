"use client";

import { useActionState } from "react";
import { createListedEventAction } from "@/lib/actions/event-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};
const input = "mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember";
const CATEGORIES = ["Nightlife", "Live music", "Quiz night", "Food & drink", "Brunch", "Culture", "Sport", "Wellness", "Market"];

export function CreateListedEventForm({ vendors }: { vendors: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createListedEventAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-ink">
          Title
          <input name="title" required placeholder="Thursday quiz night" className={input} />
        </label>
        <label className="text-sm font-medium text-ink">
          Category
          <select name="category" required className={input} defaultValue="Nightlife">
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-ink">
          First date and start time
          <input name="startAt" type="datetime-local" required className={input} />
        </label>
        <label className="text-sm font-medium text-ink">
          End time (optional)
          <input name="endTime" type="time" className={input} />
        </label>
        <label className="text-sm font-medium text-ink">
          Location
          <input name="location" required placeholder="Kisementi, Kampala" className={input} />
        </label>
        <label className="text-sm font-medium text-ink">
          Price (optional)
          <input name="priceHint" placeholder="Free entry" className={input} />
        </label>
        <label className="text-sm font-medium text-ink">
          Partner
          <select name="organizerVendorProfileId" className={input} defaultValue="">
            <option value="">None (show as a Wano pick)</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-ink">
          Repeats
          <select name="weeks" className={input} defaultValue="1">
            <option value="1">Once</option>
            <option value="4">Every week for 4 weeks</option>
            <option value="8">Every week for 8 weeks</option>
            <option value="12">Every week for 12 weeks</option>
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium text-ink">
        Description
        <textarea name="description" required rows={2} className={input} />
      </label>
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add event"}
      </button>
    </form>
  );
}
