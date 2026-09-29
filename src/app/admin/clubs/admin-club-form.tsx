"use client";

import { useActionState } from "react";
import { createClubAction } from "@/lib/actions/club-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function AdminClubForm({
  interests,
  vendors,
}: {
  interests: { id: string; label: string }[];
  vendors: { id: string; businessName: string }[];
}) {
  const [state, formAction, pending] = useActionState(createClubAction, initialState);

  return (
    <form action={formAction} className="space-y-4 border border-ink/10 bg-white p-5">
      <h2 className="font-serif-editorial text-lg text-ink">Create a club</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="text-sm font-medium text-ink">
            Club name
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={100}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <div>
          <label htmlFor="interestId" className="text-sm font-medium text-ink">
            Category
          </label>
          <select
            id="interestId"
            name="interestId"
            required
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          >
            <option value="">Select a category…</option>
            {interests.map((interest) => (
              <option key={interest.id} value={interest.id}>
                {interest.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="vendorProfileId" className="text-sm font-medium text-ink">
          Run by (optional)
        </label>
        <select
          id="vendorProfileId"
          name="vendorProfileId"
          className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        >
          <option value="">No partner — general community club</option>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.businessName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="description" className="text-sm font-medium text-ink">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          maxLength={600}
          className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create club (add host & meetup next)"}
      </button>
    </form>
  );
}
