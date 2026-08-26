"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signupAction } from "@/lib/actions/auth-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function SignupForm({ referralCode }: { referralCode?: string }) {
  const [state, formAction, pending] = useActionState(signupAction, initialState);
  const [role, setRole] = useState<"traveller" | "vendor">("traveller");

  return (
    <form action={formAction} className="space-y-4">
      {referralCode && <input type="hidden" name="ref" value={referralCode} />}
      <div className="grid grid-cols-2 gap-2 rounded-full bg-forest-50 p-1">
        {(["traveller", "vendor"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`rounded-full py-2 text-sm font-semibold transition ${
              role === r ? "bg-forest-800 text-white" : "text-forest-800/70"
            }`}
          >
            {r === "traveller" ? "I'm here to explore" : "I'm a business"}
          </button>
        ))}
      </div>
      <input type="hidden" name="role" value={role} />

      <div>
        <label htmlFor="name" className="text-sm font-medium text-forest-900">
          {role === "traveller" ? "Full name" : "Contact name"}
        </label>
        <input
          id="name"
          name="name"
          required
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
      </div>

      <div>
        <label htmlFor="email" className="text-sm font-medium text-forest-900">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium text-forest-900">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
        />
        <p className="mt-1 text-xs text-forest-800/50">At least 8 characters.</p>
      </div>

      {role === "vendor" && (
        <div className="space-y-4 rounded-xl bg-forest-50 p-4">
          <p className="text-xs font-medium text-forest-800/70">
            After signing up you&apos;ll submit KYC documents for the Wano team to review before your
            listing goes live.
          </p>
          <div>
            <label htmlFor="businessName" className="text-sm font-medium text-forest-900">
              Business name
            </label>
            <input
              id="businessName"
              name="businessName"
              required
              className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
            />
          </div>
          <div>
            <label htmlFor="location" className="text-sm font-medium text-forest-900">
              Location
            </label>
            <input
              id="location"
              name="location"
              required
              placeholder="e.g. Jinja"
              className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
            />
          </div>
          <div>
            <label htmlFor="description" className="text-sm font-medium text-forest-900">
              Business description
            </label>
            <textarea
              id="description"
              name="description"
              required
              minLength={10}
              rows={3}
              className="mt-1 w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
            />
          </div>
        </div>
      )}

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-marigold-500 px-4 py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-marigold-400 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-forest-800/70">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-nile-700 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
