"use client";

import { useActionState } from "react";
import { createMatchAction } from "@/lib/actions/xp-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function MatchForm() {
  const [state, formAction, pending] = useActionState(createMatchAction, initialState);

  return (
    <form action={formAction} className="space-y-4 border border-ink/10 bg-white p-5">
      <h2 className="font-serif-editorial text-lg text-ink">Add a match</h2>

      <div>
        <label className="text-sm font-medium text-ink">Title</label>
        <input
          name="title"
          required
          placeholder="Uganda vs Senegal — Group Stage"
          className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-ink">Description</label>
        <textarea
          name="description"
          required
          rows={2}
          className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-ink">Venue</label>
          <input
            name="location"
            required
            placeholder="Mandela National Stadium"
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink">Kick-off</label>
          <input
            name="startAt"
            type="datetime-local"
            required
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-ink">AFCON venue page (optional)</label>
        <select
          name="venueId"
          defaultValue=""
          className="mt-1 w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ember"
        >
          <option value="">Not an AFCON venue match</option>
          <option value="namboole">Mandela National Stadium (Namboole)</option>
          <option value="hoima">Hoima City Stadium</option>
        </select>
        <p className="mt-1 text-xs text-ink/40">
          Set this to list the match on that stadium&apos;s /afcon timetable.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-ink">Match length (hours)</label>
        <input
          name="durationHours"
          type="number"
          min={1}
          max={6}
          defaultValue={2}
          className="mt-1 w-24 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
        <p className="mt-1 text-xs text-ink/40">
          Used as the kick-off time plus this many hours — vouchers tied to this match expire then.
        </p>
      </div>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add match"}
      </button>
    </form>
  );
}
