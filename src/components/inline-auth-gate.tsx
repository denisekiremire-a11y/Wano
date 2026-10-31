"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { inlineLoginAction, inlineSignupAction, type InlineAuthState } from "@/lib/actions/auth-actions";

const initialState: InlineAuthState = {};

const fieldClass =
  "w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ink/40";

/** Drops into a "Log in to book" slot on a public page. Signed-out
 * visitors can sign up (or log in) right here instead of bouncing to
 * /login and back — on success the page refreshes with the new session,
 * which swaps this out for the real booking form in place, at the same
 * URL (preselected ticket/journey params and all), so there's no separate
 * "step" to return to. */
export function InlineAuthGate({ ctaLabel }: { ctaLabel: string }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"signup" | "login">("signup");

  function onSuccess() {
    router.refresh();
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink/85"
      >
        {ctaLabel}
      </button>
    );
  }

  return (
    <div className="max-w-sm rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">
          {mode === "signup" ? `Sign up to ${ctaLabel.toLowerCase()}` : `Log in to ${ctaLabel.toLowerCase()}`}
        </p>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs font-medium text-ink/40 hover:text-ink"
        >
          Cancel
        </button>
      </div>

      {mode === "signup" ? <InlineSignupForm onSuccess={onSuccess} /> : <InlineLoginForm onSuccess={onSuccess} />}

      <button
        type="button"
        onClick={() => setMode(mode === "signup" ? "login" : "signup")}
        className="mt-3 text-xs font-medium text-ember hover:underline"
      >
        {mode === "signup" ? "Already have an account? Log in" : "New here? Sign up"}
      </button>
    </div>
  );
}

function InlineSignupForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState(inlineSignupAction, initialState);
  const submitted = useRef(false);

  useEffect(() => {
    if (!pending && submitted.current && state.success) {
      submitted.current = false;
      onSuccess();
    }
  }, [pending, state, onSuccess]);

  return (
    <form
      action={formAction}
      onSubmit={() => {
        submitted.current = true;
      }}
      className="mt-3 space-y-2"
    >
      <input type="hidden" name="role" value="traveller" />
      <input name="name" placeholder="Full name" required className={fieldClass} />
      <input name="email" type="email" placeholder="Email" required className={fieldClass} />
      <input
        name="password"
        type="password"
        placeholder="Password (min 8 characters)"
        required
        minLength={8}
        className={fieldClass}
      />
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-marigold-500 px-4 py-2 text-sm font-semibold text-forest-950 transition hover:bg-marigold-400 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account & continue"}
      </button>
    </form>
  );
}

function InlineLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState(inlineLoginAction, initialState);
  const submitted = useRef(false);

  useEffect(() => {
    if (!pending && submitted.current && state.success) {
      submitted.current = false;
      onSuccess();
    }
  }, [pending, state, onSuccess]);

  return (
    <form
      action={formAction}
      onSubmit={() => {
        submitted.current = true;
      }}
      className="mt-3 space-y-2"
    >
      <input name="email" type="email" placeholder="Email" required className={fieldClass} />
      <input name="password" type="password" placeholder="Password" required className={fieldClass} />
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Logging in…" : "Log in & continue"}
      </button>
    </form>
  );
}
