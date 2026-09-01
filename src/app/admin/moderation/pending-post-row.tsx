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
    <div className="rounded-xl border border-marigold-300 bg-marigold-50 p-3">
      <p className="text-sm font-medium text-forest-900">
        {authorName} {authorUsername ? `(@${authorUsername})` : ""}
      </p>
      <p className="mt-1 text-sm text-forest-800/80">{content}</p>
      <p className="mt-1 text-xs text-forest-800/50">
        {new Date(createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => reviewPendingPostAction(postId, "approve"))}
          className="rounded-full bg-forest-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => reviewPendingPostAction(postId, "remove"))}
          className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-60"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
