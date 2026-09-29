"use client";

import { useActionState } from "react";
import { setVendorPinAction } from "@/lib/actions/reward-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function PinForm({ hasPin }: { hasPin: boolean }) {
  const [state, formAction, pending] = useActionState(setVendorPinAction, initialState);
  const done = !state.error && state !== initialState;

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="text-sm font-medium text-ink">{hasPin ? "New venue PIN" : "Set a venue PIN"}</label>
        <input
          name="pin"
          type="text"
          inputMode="numeric"
          pattern="\d{4,6}"
          maxLength={6}
          placeholder="4-6 digits"
          required
          className="mt-1 w-32 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Saving…" : hasPin ? "Rotate PIN" : "Set PIN"}
      </button>
      {state.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
      {done && <p className="eyebrow w-full text-ink">PIN saved.</p>}
    </form>
  );
}
