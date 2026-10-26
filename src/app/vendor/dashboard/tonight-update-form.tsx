"use client";

import { useActionState, useState } from "react";
import { postTonightUpdateAction } from "@/lib/actions/tonight-update-actions";

const MAX = 140;

export function TonightUpdateForm({ current, verified }: { current: string | null; verified: boolean }) {
  const [state, action, pending] = useActionState(postTonightUpdateAction, undefined);
  const [text, setText] = useState(current ?? "");
  return (
    <form action={action} className="space-y-2 border border-ink/10 bg-white p-4">
      <p className="eyebrow text-ember">What&apos;s on tonight?</p>
      <p className="text-sm text-ink/60">
        One line, 30 seconds. It shows on the Wano home page until midnight.
        {!verified && " It goes live once your venue is verified."}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX}
          placeholder="Live band from 8, 2-for-1 cocktails till 9"
          className="min-w-0 flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/85 disabled:opacity-60"
        >
          {pending ? "Posting…" : current ? "Update" : "Post"}
        </button>
      </div>
      <p className="font-mono-data text-xs text-ink/40">
        {text.length}/{MAX}
        {state?.ok && " · Saved"}
      </p>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
