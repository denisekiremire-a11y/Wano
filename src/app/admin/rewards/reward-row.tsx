"use client";

import Link from "next/link";
import { useTransition } from "react";
import { setRewardStatusAction, type RewardStatus } from "@/lib/actions/reward-actions";
import { formatRewardDiscount, type RewardDiscountType } from "@/lib/reward-format";

const STATUS_STYLE: Record<RewardStatus, string> = {
  active: "bg-emerald-100 text-emerald-800",
  draft: "border border-ink/20 text-ink/60",
  paused: "bg-amber-100 text-amber-800",
  expired: "bg-ink/10 text-ink/50",
};

const NEXT_ACTIONS: Record<RewardStatus, { label: string; next: RewardStatus }[]> = {
  draft: [{ label: "Activate", next: "active" }],
  active: [
    { label: "Pause", next: "paused" },
    { label: "Expire", next: "expired" },
  ],
  paused: [
    { label: "Resume", next: "active" },
    { label: "Expire", next: "expired" },
  ],
  expired: [{ label: "Reactivate", next: "active" }],
};

export function RewardRow({
  rewardId,
  title,
  description,
  discountType,
  discountValue,
  minBillMinor,
  source,
  pointsCost,
  wanoSharePct,
  targetLabel,
  status,
}: {
  rewardId: string;
  title: string;
  description: string | null;
  discountType: RewardDiscountType;
  discountValue: string | null;
  minBillMinor: number | null;
  source: string;
  pointsCost: number | null;
  wanoSharePct: number | null;
  targetLabel: string;
  status: RewardStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-3 border border-ink/10 bg-white p-4">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <span className={`eyebrow rounded-full px-2 py-0.5 text-[10px] ${STATUS_STYLE[status]}`}>{status}</span>
        </div>
        {description && <p className="text-xs text-ink/60">{description}</p>}
        <p className="font-mono-data text-[11px] text-ink/40">
          {formatRewardDiscount(discountType, discountValue, minBillMinor)} · {targetLabel} ·{" "}
          <span className="capitalize">{source}</span>
          {pointsCost != null && ` (${pointsCost.toLocaleString()} pts)`}
          {wanoSharePct != null && ` · Wano ${wanoSharePct}%`}
        </p>
      </div>
      <div className="flex flex-none items-center gap-2">
        <Link
          href={`/admin/rewards/${rewardId}/edit`}
          className="rounded-full border border-ink/20 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-ink/5"
        >
          Edit
        </Link>
        {NEXT_ACTIONS[status].map((action) => (
          <button
            key={action.next}
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => setRewardStatusAction(rewardId, action.next))}
            className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-ink/85 disabled:opacity-50"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
