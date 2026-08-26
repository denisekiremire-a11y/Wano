"use client";

import { useActionState } from "react";
import { updateBirthdayAction } from "@/lib/actions/profile-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function BirthdayEditor({ dateOfBirth }: { dateOfBirth: string | null }) {
  const [state, formAction, pending] = useActionState(updateBirthdayAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="dateOfBirth" className="text-xs font-medium text-forest-800/70">
          🎂 Your birthday
        </label>
        <input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          defaultValue={dateOfBirth ?? ""}
          required
          className="mt-1 block rounded-lg border border-forest-900/15 px-3 py-1.5 text-sm outline-none focus:border-forest-600"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-forest-800 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : dateOfBirth ? "Update" : "Save"}
      </button>
      {state.error && <p className="w-full text-xs text-red-700">{state.error}</p>}
      {!dateOfBirth && (
        <p className="w-full text-xs text-forest-800/50">
          Add your birthday to unlock birthday perks at Wano venues.
        </p>
      )}
    </form>
  );
}
