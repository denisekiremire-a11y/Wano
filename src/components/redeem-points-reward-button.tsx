"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast/toast-provider";
import { redeemPointsRewardAction } from "@/lib/actions/reward-actions";

export function RedeemPointsRewardButton({
  rewardId,
  title,
  discountLabel,
  pointsCost,
}: {
  rewardId: string;
  title: string;
  discountLabel: string;
  pointsCost: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { push } = useToast();

  function doRedeem() {
    startTransition(async () => {
      // Called directly (not via useActionState's form-submit lifecycle) —
      // a successful redemption drops the points balance shown elsewhere on
      // this same page via revalidatePath, so an effect-based toast keyed
      // to this button's own pending state would lose that race.
      const result = await redeemPointsRewardAction(rewardId);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        push("Redeemed — check your wallet.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmDialog
        title="Redeem this reward?"
        body={
          <>
            <p className="font-medium text-forest-900">{title}</p>
            <p>{discountLabel}</p>
            <p className="mt-2">
              {pointsCost.toLocaleString()} pts will be deducted from your balance, and it&apos;ll show up in your Passport
              wallet.
            </p>
          </>
        }
        confirmLabel="Redeem"
        onConfirm={doRedeem}
        trigger={(open) => (
          <button
            type="button"
            onClick={open}
            disabled={pending}
            className="rounded-full bg-marigold-500 px-3 py-1.5 text-xs font-semibold text-forest-950 transition hover:bg-marigold-400 disabled:opacity-60"
          >
            {pending ? "Redeeming…" : `Redeem · ${pointsCost.toLocaleString()} pts`}
          </button>
        )}
      />
      {error && <p className="text-[11px] text-red-700">{error}</p>}
    </div>
  );
}
