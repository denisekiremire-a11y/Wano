"use client";

import { useActionState } from "react";
import { unlockStaffSessionAction } from "@/lib/actions/staff-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function UnlockForm({ staffAccessToken, businessName }: { staffAccessToken: string; businessName: string }) {
  const [state, formAction, pending] = useActionState(unlockStaffSessionAction, initialState);

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <p className="eyebrow text-ink/40">{businessName}</p>
      <h1 className="font-serif-editorial mt-1 text-2xl text-ink">Staff check-in</h1>
      <p className="mt-2 text-sm text-ink/60">
        Enter the venue PIN to unlock scanning for this shift. You never need the venue&apos;s email or password here.
      </p>

      <form action={formAction} className="mt-6 space-y-3">
        <input type="hidden" name="staffAccessToken" value={staffAccessToken} />
        <div>
          <label className="text-sm font-medium text-ink">Venue PIN</label>
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            required
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-3 text-lg tracking-widest outline-none focus:border-ember"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60"
        >
          {pending ? "Checking…" : "Unlock"}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </form>
    </div>
  );
}
