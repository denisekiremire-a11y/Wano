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
    <div className="border border-ink/10 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-ember">
            {targetType} · {reason}
          </p>
          <p className="mt-1 text-sm text-ink">{preview}</p>
          {note && <p className="mt-1 text-xs text-ink/60">Reporter note: {note}</p>}
          <p className="font-mono-data mt-1 text-xs text-ink/40">
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
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
              a.value === "dismiss"
                ? "border-ink/20 text-ink hover:bg-ink/5"
                : "border-red-200 text-red-600 hover:bg-red-50"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
