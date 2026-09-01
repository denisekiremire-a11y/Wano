"use client";

import { useState, useTransition } from "react";
import { blockUserAction, createReportAction } from "@/lib/actions/moderation-actions";

const REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "fake", label: "Fake or misleading" },
  { value: "other", label: "Other" },
] as const;

export function ReportBlockMenu({
  targetType,
  targetId,
  targetTravellerId,
  targetLabel,
}: {
  targetType: "post" | "comment" | "user" | "review";
  targetId: string;
  targetTravellerId?: string;
  targetLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "report" | "reported" | "blocked">("menu");
  const [reason, setReason] = useState<(typeof REASONS)[number]["value"]>("spam");
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setMode("menu");
          setOpen(true);
        }}
        aria-label="Report or block"
        className="text-forest-800/40 hover:text-forest-800"
      >
        ⋯
      </button>
    );
  }

  return (
    <div className="absolute right-0 top-6 z-10 w-56 rounded-xl border border-forest-900/10 bg-white p-3 shadow-lg">
      {mode === "menu" && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setMode("report")}
            className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-forest-900 hover:bg-forest-50"
          >
            Report
          </button>
          {targetTravellerId && (
            <button
              type="button"
              onClick={() =>
                startTransition(async () => {
                  await blockUserAction(targetTravellerId);
                  setMode("blocked");
                })
              }
              className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-red-700 hover:bg-red-50"
            >
              Block {targetLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="block w-full rounded-lg px-2 py-1.5 text-left text-xs text-forest-800/50 hover:bg-forest-50"
          >
            Cancel
          </button>
        </div>
      )}

      {mode === "report" && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-forest-900">Why are you reporting this?</p>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as typeof reason)}
            className="w-full rounded-lg border border-forest-900/15 bg-white px-2 py-1.5 text-sm outline-none"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await createReportAction(targetType, targetId, reason);
                  setMode("reported");
                })
              }
              className="flex-1 rounded-full bg-red-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Sending…" : "Submit report"}
            </button>
            <button
              type="button"
              onClick={() => setMode("menu")}
              className="rounded-full border border-forest-900/15 px-3 py-1.5 text-xs font-semibold text-forest-800"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {mode === "reported" && (
        <div className="space-y-2 text-center">
          <p className="text-xs text-forest-800/80">
            Thanks — an admin will review this. You won&apos;t see this content flagged as reviewed, but it&apos;s
            in the queue.
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full rounded-full border border-forest-900/15 px-3 py-1.5 text-xs font-semibold text-forest-800"
          >
            Close
          </button>
        </div>
      )}

      {mode === "blocked" && (
        <div className="space-y-2 text-center">
          <p className="text-xs text-forest-800/80">
            {targetLabel} is blocked. Their posts and comments won&apos;t show to you, and yours won&apos;t show to
            them.
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full rounded-full border border-forest-900/15 px-3 py-1.5 text-xs font-semibold text-forest-800"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
