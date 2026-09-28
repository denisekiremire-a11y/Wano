"use client";

import { useTransition } from "react";
import { reviewPendingPostAction } from "@/lib/actions/moderation-actions";

export function PendingPostRow({
  postId,
  authorName,
  authorUsername,
  content,
  createdAt,
}: {
  postId: string;
  authorName: string;
  authorUsername: string | null;
  content: string;
  createdAt: Date;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="border border-ember/30 bg-ember/5 p-3">
      <p className="text-sm font-medium text-ink">
        {authorName} {authorUsername ? `(@${authorUsername})` : ""}
      </p>
      <p className="mt-1 text-sm text-ink/80">{content}</p>
      <p className="font-mono-data mt-1 text-xs text-ink/50">
        {new Date(createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => reviewPendingPostAction(postId, "approve"))}
          className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => reviewPendingPostAction(postId, "remove"))}
          className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
