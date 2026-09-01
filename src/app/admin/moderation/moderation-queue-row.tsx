"use client";

import { useTransition } from "react";
import { resolveReportAction } from "@/lib/actions/moderation-actions";

const ACTIONS = [
  { value: "dismiss", label: "Dismiss" },
  { value: "hide", label: "Hide" },
  { value: "remove", label: "Remove" },
  { value: "warn", label: "Warn" },
  { value: "suspend", label: "Suspend" },
] as const;

export function ModerationQueueRow({
  reportId,
  targetType,
  reason,
  note,
  preview,
  reporterName,
  createdAt,
}: {
  reportId: string;
  targetType: string;
  reason: string;
  note: string | null;
  preview: string;
  reporterName: string;
  createdAt: Date;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-forest-900/10 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-marigold-700">
            {targetType} · {reason}
          </p>
          <p className="mt-1 text-sm text-forest-900">{preview}</p>
          {note && <p className="mt-1 text-xs text-forest-800/60">Reporter note: {note}</p>}
          <p className="mt-1 text-xs text-forest-800/40">
            Reported by {reporterName} · {new Date(createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ACTIONS.map((a) => (
          <button
            key={a.value}
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => resolveReportAction(reportId, a.value))}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50 ${
              a.value === "dismiss"
                ? "border-forest-900/15 text-forest-800 hover:bg-forest-50"
                : "border-red-200 text-red-700 hover:bg-red-50"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
