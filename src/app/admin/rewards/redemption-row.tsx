"use client";

import { useTransition } from "react";
import { setRedemptionStatusAction } from "@/lib/actions/reward-actions";

export function RedemptionRow({
  redemptionId,
  travellerName,
  rewardTitle,
  pointsSpent,
  status,
  createdAt,
}: {
  redemptionId: string;
  travellerName: string;
  rewardTitle: string;
  pointsSpent: number;
  status: "pending" | "fulfilled" | "cancelled";
  createdAt: string;
}) {
  const [pending, startTransition] = useTransition();

  const statusStyle =
    status === "fulfilled"
      ? "bg-forest-800 text-white"
      : status === "cancelled"
        ? "bg-red-100 text-red-700"
        : "bg-marigold-100 text-marigold-700";

  return (
    <div className="flex items-center justify-between rounded-2xl border border-forest-900/10 bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-forest-900">{travellerName}</p>
        <p className="text-xs text-forest-800/60">
          {rewardTitle} · {pointsSpent.toLocaleString()} pts
        </p>
        <p className="text-[11px] text-forest-800/45">{createdAt}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle}`}>{status}</span>
        {status === "pending" && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => setRedemptionStatusAction(redemptionId, "fulfilled"))}
              className="rounded-full bg-forest-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-forest-700 disabled:opacity-50"
            >
              Fulfil
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => setRedemptionStatusAction(redemptionId, "cancelled"))}
              className="rounded-full bg-forest-100 px-3 py-1.5 text-xs font-semibold text-forest-800 transition hover:bg-forest-200 disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
