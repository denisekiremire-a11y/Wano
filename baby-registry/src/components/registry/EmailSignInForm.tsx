"use client";

import { useActionState } from "react";
import { Loader2, Mail } from "lucide-react";
import { signInWithEmailAction, type SignInResult } from "@/app/actions/my-gifts";

/** "Sign in" to My gifts with just an email address. */
export function EmailSignInForm() {
  const [state, action, pending] = useActionState<SignInResult | null, FormData>(signInWithEmailAction, null);
  return (
    <section className="card p-5 sm:p-6" aria-labelledby="signin-heading" data-testid="email-signin-form">
      <h2 id="signin-heading" className="flex items-center gap-2 font-sans text-base font-semibold text-ink">
        <Mail className="size-5 text-sage-700" aria-hidden /> See your gifts
      </h2>
      <p className="mt-1 text-sm text-ink-soft">Enter the email you used when reserving. You’ll see every gift you reserved with it, on any phone or computer.</p>
      <form action={action} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="signin-email" className="sr-only">
          Your email
        </label>
        <input
          id="signin-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          className="field-input flex-1 py-3 text-base"
        />
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="signin-hp">Leave this field empty</label>
          <input id="signin-hp" name="hp_x" tabIndex={-1} autoComplete="off" data-lpignore="true" data-1p-ignore="true" data-form-type="other" defaultValue="" />
        </div>
        <button type="submit" className="btn-primary py-3" disabled={pending} data-testid="signin-submit">
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Show my gifts
        </button>
      </form>
      {state && !state.ok && (
        <p className="mt-2 text-sm text-rose-700" role="alert">
          {state.message}
        </p>
      )}
    </section>
  );
}
