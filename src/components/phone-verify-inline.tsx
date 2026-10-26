"use client";

import { useState, useTransition } from "react";
import { sendPhoneVerificationCodeAction, verifyPhoneCodeAction } from "@/lib/actions/phone-verification-actions";

/** Two steps on one line: send a WhatsApp code, then type it in. */
export function PhoneVerifyInline() {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      {!sent ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await sendPhoneVerificationCodeAction();
              if (res.error) setMessage(res.error);
              else {
                setSent(true);
                setMessage("We sent a code to your WhatsApp.");
              }
            })
          }
          className="rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send me a code"}
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await verifyPhoneCodeAction(code);
              setMessage(res.error ?? "Phone verified. You can claim Drops now.");
              if (!res.error) window.location.reload();
            });
          }}
          className="flex gap-2"
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            placeholder="6-digit code"
            className="w-36 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Verify
          </button>
        </form>
      )}
      {message && <p className="text-xs text-ink/60">{message}</p>}
    </div>
  );
}
