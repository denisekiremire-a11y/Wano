"use client";

import { useActionState } from "react";
import { updateClubDetailsAction } from "@/lib/actions/club-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function ClubDetailsForm({
  clubId,
  hosts,
  initial,
}: {
  clubId: string;
  hosts: { id: string; name: string; role: string }[];
  initial: { hostUserId: string; coverImage: string; city: string; cadence: string; whatsappInviteUrl: string };
}) {
  const boundAction = updateClubDetailsAction.bind(null, clubId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-forest-800/70">Host</label>
          <select
            name="hostUserId"
            defaultValue={initial.hostUserId}
            className="mt-1 w-full rounded-lg border border-forest-900/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest-600"
          >
            <option value="">— No host assigned —</option>
            {hosts.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.role})
              </option>
            ))}
          </select>
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
          <label className="text-xs font-medium text-forest-800/70">Cadence</label>
          <input
            name="cadence"
            placeholder="Every 2nd Saturday"
            defaultValue={initial.cadence}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-forest-800/70">Cover image URL</label>
          <input
            name="coverImage"
            type="url"
            defaultValue={initial.coverImage}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-forest-800/70">WhatsApp invite URL</label>
          <input
            name="whatsappInviteUrl"
            type="url"
            placeholder="https://chat.whatsapp.com/..."
            defaultValue={initial.whatsappInviteUrl}
            className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
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
