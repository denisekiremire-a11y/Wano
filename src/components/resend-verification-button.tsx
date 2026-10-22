"use client";

import { useState, useTransition } from "react";
import { resendVerificationEmailAction } from "@/lib/actions/email-verification-actions";

export function ResendVerificationButton() {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resend() {
    startTransition(async () => {
      const result = await resendVerificationEmailAction();
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setSent(true);
      }
    });
  }

  if (sent) return <p className="text-sm text-ink/60">Verification email sent — check your inbox.</p>;

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={resend}
        disabled={pending}
        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Resend verification email"}
      </button>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
