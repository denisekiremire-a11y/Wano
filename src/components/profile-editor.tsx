"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/lib/actions/profile-actions";
import { PhoneVerifyInline } from "@/components/phone-verify-inline";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

const input =
  "mt-1 block w-full rounded-lg border border-forest-900/15 px-3 py-1.5 text-sm outline-none focus:border-forest-600";

export function ProfileEditor({
  name,
  email,
  phone,
  phoneVerified,
}: {
  name: string;
  email: string;
  phone: string | null;
  phoneVerified: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);
  const justSaved = !state.error && state !== initialState;

  return (
    <form action={formAction} className="max-w-sm space-y-3">
      <div>
        <label htmlFor="name" className="text-xs font-medium text-forest-800/70">
          Name
        </label>
        <input id="name" name="name" type="text" defaultValue={name} required maxLength={80} className={input} />
      </div>
      <div>
        <label htmlFor="email" className="text-xs font-medium text-forest-800/70">
          Email
        </label>
        <input id="email" name="email" type="email" defaultValue={email} required className={input} />
        <p className="mt-1 text-xs text-forest-800/50">Changing this means re-verifying the new address.</p>
      </div>
      <div>
        <label htmlFor="phone" className="text-xs font-medium text-forest-800/70">
          Phone (optional)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={phone ?? ""}
          placeholder="07xx xxx xxx"
          className={input}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-forest-800 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      {justSaved && <p className="eyebrow text-forest-800">Saved.</p>}

      {phone && !phoneVerified && (
        <div className="border-t border-forest-900/10 pt-3">
          <p className="text-xs font-medium text-forest-800/70">Your phone isn&apos;t verified yet.</p>
          <div className="mt-1">
            <PhoneVerifyInline />
          </div>
        </div>
      )}
    </form>
  );
}
