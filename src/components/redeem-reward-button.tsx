"use client";

import { useActionState } from "react";
import { redeemRewardAction } from "@/lib/actions/reward-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function RedeemRewardButton({
  rewardId,
  disabled,
  disabledReason,
}: {
  rewardId: string;
  disabled: boolean;
  disabledReason?: string;
}) {
  const [state, formAction, pending] = useActionState(redeemRewardAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="rewardId" value={rewardId} />
      <button
        type="submit"
        disabled={disabled || pending}
        title={disabled ? disabledReason : undefined}
        className="rounded-full bg-marigold-500 px-3 py-1.5 text-xs font-semibold text-forest-950 transition hover:bg-marigold-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Redeeming…" : "Redeem"}
      </button>
      {state.error && <p className="text-[11px] text-red-700">{state.error}</p>}
    </form>
  );
}
