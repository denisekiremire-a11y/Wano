"use client";

import { useActionState } from "react";
import { subscribeToNewsletterAction } from "@/lib/actions/newsletter-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function NewsletterForm({ source }: { source: string }) {
  const [state, formAction, pending] = useActionState(subscribeToNewsletterAction, initialState);

  return (
    <form action={formAction} className="border border-ink/10 bg-white p-4">
      <input type="hidden" name="source" value={source} />
      <p className="text-sm font-semibold text-ink">Get the Journal in your inbox</p>
      <p className="mt-0.5 text-xs text-ink/60">
        One email when there&apos;s a new guide worth reading. No spam.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          name="name"
          placeholder="Name (optional)"
          className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember sm:w-32"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="you@email.com"
          className="w-full flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
        >
          {pending ? "…" : "Subscribe"}
        </button>
      </div>
      {state.error && <p className="mt-2 text-xs text-red-700">{state.error}</p>}
      {!state.error && state !== initialState && (
        <p className="mt-2 text-xs text-ember">Almost there — check your inbox to confirm.</p>
      )}
    </form>
  );
}
