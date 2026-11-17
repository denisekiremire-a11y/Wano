"use client";

import { useActionState } from "react";
import { Loader2, Mail } from "lucide-react";
import { requestListLinkAction, type ListLinkResult } from "@/app/actions/my-gifts";

export function EmailListForm({ compact }: { compact?: boolean }) {
  const [state, action, pending] = useActionState<ListLinkResult | null, FormData>(requestListLinkAction, null);
  return (
    <section className={`rounded-2xl border border-linen bg-white ${compact ? "p-4" : "p-5"}`} aria-labelledby="email-list-heading" data-testid="email-list-form">
      <h2 id="email-list-heading" className="flex items-center gap-2 font-sans text-sm font-semibold text-ink">
        <Mail className="size-4 text-sage-700" aria-hidden /> Reserved with your email? Get your list
      </h2>
      <p className="mt-1 text-sm text-ink-soft">We’ll email you a private link to every gift you reserved with that address — on any phone or computer.</p>
      <form action={action} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="list-email" className="sr-only">
          Your email
        </label>
        <input id="list-email" name="email" type="email" required autoComplete="email" inputMode="email" placeholder="you@example.com" className="field-input flex-1" />
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="list-hp">Leave this field empty</label>
          <input id="list-hp" name="hp_x" tabIndex={-1} autoComplete="off" data-lpignore="true" data-1p-ignore="true" data-form-type="other" defaultValue="" />
        </div>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Email me my list
        </button>
      </form>
      {state && (
        <p className={`mt-2 text-sm ${state.ok ? "text-sage-700" : "text-rose-700"}`} role="status" data-testid="email-list-status">
          {state.message}
        </p>
      )}
    </section>
  );
}
