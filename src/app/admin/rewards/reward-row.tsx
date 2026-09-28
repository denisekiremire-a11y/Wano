"use client";

import { useTransition } from "react";
import { toggleRewardActiveAction } from "@/lib/actions/reward-actions";
import { formatRewardDiscount } from "@/lib/reward-format";

export function RewardRow({
  rewardId,
  title,
  description,
  discountType,
  discountValue,
  source,
  pointsCost,
  targetLabel,
  active,
}: {
  rewardId: string;
  title: string;
  description: string | null;
  discountType: "percent" | "fixed" | "freebie";
  discountValue: string | null;
  source: string;
  pointsCost: number | null;
  targetLabel: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-3 border border-ink/10 bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description && <p className="text-xs text-ink/60">{description}</p>}
        <p className="font-mono-data text-[11px] text-ink/40">
          {formatRewardDiscount(discountType, discountValue)} · {targetLabel} ·{" "}
          <span className="capitalize">{source}</span>
          {pointsCost != null && ` (${pointsCost.toLocaleString()} pts)`}
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => toggleRewardActiveAction(rewardId, !active))}
        className={`flex-none rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
          active ? "border border-ink/20 text-ink hover:bg-ink/5" : "bg-ink text-white hover:bg-ink/85"
        }`}
      >
        {active ? "Active — deactivate" : "Inactive — activate"}
      </button>
    </div>
  );
}
