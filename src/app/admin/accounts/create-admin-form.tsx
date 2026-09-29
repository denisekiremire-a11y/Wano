"use client";

import { useActionState } from "react";
import { createAdminAction } from "@/lib/actions/admin-account-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function CreateAdminForm() {
  const [state, formAction, pending] = useActionState(createAdminAction, initialState);

  return (
    <form action={formAction} className="space-y-4 border border-ink/10 bg-white p-5">
      <h2 className="font-serif-editorial text-lg text-ink">Create an admin account</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="text-sm font-medium text-ink">
            Name
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={80}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium text-ink">
            Temporary password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={72}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <div>
          <label htmlFor="level" className="text-sm font-medium text-ink">
            Level
          </label>
          <select
            id="level"
            name="level"
            defaultValue="support"
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm capitalize outline-none focus:border-ember"
          >
            <option value="support">Support</option>
            <option value="ops">Ops</option>
            <option value="super">Super</option>
          </select>
        </div>
      </div>
      {state.error && <p className="text-xs text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create admin"}
      </button>
    </form>
  );
}
