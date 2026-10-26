"use client";

import { useActionState } from "react";
import { claimDropAction } from "@/lib/actions/drop-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function ClaimDropButton({ dropId, label }: { dropId: string; label: string }) {
  const [state, formAction, pending] = useActionState(claimDropAction, initialState);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="dropId" value={dropId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ember/90 disabled:opacity-60"
      >
        {pending ? "Claiming…" : label}
      </button>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
