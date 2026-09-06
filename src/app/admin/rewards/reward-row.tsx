"use client";

import { useTransition } from "react";
import { toggleRewardActiveAction } from "@/lib/actions/reward-actions";

export function RewardRow({
  rewardId,
  title,
  description,
  pointsCost,
  stock,
  active,
}: {
  rewardId: string;
  title: string;
  description: string;
  pointsCost: number;
  stock: number | null;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between rounded-2xl border border-forest-900/10 bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-forest-900">{title}</p>
        <p className="text-xs text-forest-800/60">{description}</p>
        <p className="text-[11px] text-forest-800/45">
          {pointsCost.toLocaleString()} pts · {stock === null ? "Unlimited stock" : `${stock} in stock`}
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => toggleRewardActiveAction(rewardId, !active))}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
          active ? "bg-forest-100 text-forest-800" : "bg-forest-800 text-white"
        }`}
      >
        {active ? "Active — deactivate" : "Inactive — activate"}
      </button>
    </div>
  );
}
