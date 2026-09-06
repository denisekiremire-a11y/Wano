"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveSubmissionAction, rejectSubmissionAction } from "@/lib/actions/admin-submission-actions";

export function SubmissionRow({
  submissionId,
  entityType,
  isEdit,
  businessName,
  currentTitle,
  payload,
  createdAt,
}: {
  submissionId: string;
  entityType: "listing" | "reward";
  isEdit: boolean;
  businessName: string;
  currentTitle: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
}) {
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [notes, setNotes] = useState("");
  const router = useRouter();

  function approve() {
    startTransition(async () => {
      await approveSubmissionAction(submissionId);
      router.refresh();
    });
  }

  function reject() {
    startTransition(async () => {
      await rejectSubmissionAction(submissionId, notes);
      router.refresh();
    });
  }

  const title = typeof payload.title === "string" ? payload.title : "Untitled";
  const description = typeof payload.description === "string" ? payload.description : null;

  return (
    <div className="rounded-2xl border border-forest-900/10 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-marigold-700">
            {entityType} · {isEdit ? "edit" : "new"} · {businessName}
          </p>
          <p className="mt-1 text-sm font-medium text-forest-900">{title}</p>
          {isEdit && currentTitle && currentTitle !== title && (
            <p className="text-xs text-forest-800/50">Currently live as &quot;{currentTitle}&quot;</p>
          )}
          {description && <p className="mt-1 text-sm text-forest-800/70 line-clamp-3">{description}</p>}
          <p className="mt-1 text-[11px] text-forest-800/40">
            Submitted {new Date(createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </p>
        </div>
        <div className="flex flex-none flex-col items-end gap-1.5">
          <button
            type="button"
            disabled={pending}
            onClick={approve}
            className="rounded-full bg-forest-800 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setRejecting((v) => !v)}
            className="rounded-full border border-forest-900/15 px-3 py-1.5 text-xs font-medium text-forest-800 disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>

      {rejecting && (
        <div className="mt-3 flex gap-2 border-t border-forest-900/5 pt-3">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why? (shown to the vendor)"
            className="flex-1 rounded-lg border border-forest-900/15 px-3 py-1.5 text-sm outline-none focus:border-forest-600"
          />
          <button
            type="button"
            disabled={pending}
            onClick={reject}
            className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Confirm reject
          </button>
        </div>
      )}
    </div>
  );
}
