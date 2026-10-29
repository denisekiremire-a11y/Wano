"use client";

import { useActionState, useState } from "react";
import { deleteMyAccountAction } from "@/lib/actions/account-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteMyAccountAction, initialState);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-red-700 underline underline-offset-2"
      >
        Delete my account
      </button>
    );
  }

  return (
    <form action={formAction} className="max-w-sm space-y-3">
      <p className="text-sm text-ink/70">
        This permanently removes your name, email, phone, photo, posts, stories, comments, reviews and
        saved places, and signs you out. Your Passport XP and stamps can&apos;t be recovered. Past
        bookings stay on record for the venue, with your name removed.
      </p>
      <label htmlFor="confirm-delete" className="block text-xs font-medium text-ink/70">
        Type DELETE to confirm
      </label>
      <input
        id="confirm-delete"
        name="confirm"
        autoComplete="off"
        className="block w-full rounded-lg border border-ink/15 px-3 py-1.5 text-sm outline-none focus:border-red-700"
      />
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-red-700 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Delete my account"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-ink/70 underline">
          Cancel
        </button>
      </div>
    </form>
  );
}
