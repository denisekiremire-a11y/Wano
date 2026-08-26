"use client";

import { useActionState } from "react";
import { createPostAction } from "@/lib/actions/social-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function PostComposer() {
  const [state, formAction, pending] = useActionState(createPostAction, initialState);

  return (
    <form action={formAction} className="rounded-2xl border border-forest-900/10 bg-white p-4">
      <textarea
        name="content"
        required
        maxLength={500}
        rows={2}
        placeholder="What's happening?"
        className="w-full resize-none rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
      />
      {state.error && <p className="mt-1 text-xs text-red-700">{state.error}</p>}
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
        >
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
