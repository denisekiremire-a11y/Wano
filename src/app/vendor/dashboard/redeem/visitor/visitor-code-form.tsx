"use client";

import { useActionState } from "react";
import { lookupVisitorCodeAction } from "@/lib/actions/check-in-actions";

export function VisitorCodeForm() {
  const [state, action, pending] = useActionState(lookupVisitorCodeAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <label htmlFor="visitor-code" className="text-sm font-medium text-ink">
        Visitor code
      </label>
      <div className="flex items-center gap-3">
        <input
          id="visitor-code"
          name="code"
          inputMode="numeric"
          autoComplete="off"
          placeholder="123 456"
          maxLength={7}
          className="font-mono-data w-36 rounded-lg border border-ink/15 px-3 py-2 text-base tracking-widest outline-none focus:border-ember"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60"
        >
          {pending ? "Checking…" : "Open visitor"}
        </button>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
