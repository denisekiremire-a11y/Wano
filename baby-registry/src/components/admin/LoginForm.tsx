"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { signInAction, type ActionResult } from "@/app/actions/admin";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(signInAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className="field-input" />
      </div>
      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field-input" />
      </div>
      {state && !state.ok && (
        <p className="text-sm text-rose-700" role="alert">
          {state.message}
        </p>
      )}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Sign in
      </button>
    </form>
  );
}
