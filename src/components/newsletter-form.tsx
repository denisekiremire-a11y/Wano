"use client";

import { useActionState } from "react";
import { subscribeToNewsletterAction } from "@/lib/actions/newsletter-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function NewsletterForm({ source }: { source: string }) {
  const [state, formAction, pending] = useActionState(subscribeToNewsletterAction, initialState);

  return (
    <form action={formAction} className="rounded-2xl border border-forest-900/10 bg-white p-4">
      <input type="hidden" name="source" value={source} />
      <p className="text-sm font-semibold text-forest-900">Get the Journal in your inbox</p>
      <p className="mt-0.5 text-xs text-forest-800/60">
        One email when there's a new guide worth reading. No spam.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          name="name"
          placeholder="Name (optional)"
          className="w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600 sm:w-32"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="you@email.com"
          className="w-full flex-1 rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-forest-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
        >
          {pending ? "…" : "Subscribe"}
        </button>
      </div>
      {state.error && <p className="mt-2 text-xs text-red-700">{state.error}</p>}
      {!state.error && state !== initialState && (
        <p className="mt-2 text-xs text-forest-700">Almost there — check your inbox to confirm.</p>
      )}
    </form>
  );
}
