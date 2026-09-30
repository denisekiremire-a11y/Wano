"use client";

import { useActionState, useState } from "react";
import { voidVoucherAction } from "@/lib/actions/reward-actions";
import { formatRewardDiscount, type RewardDiscountType } from "@/lib/reward-format";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

const STATUS_STYLE: Record<string, string> = {
  claimed: "border border-ink/20 text-ink/70",
  redeemed: "bg-emerald-100 text-emerald-800",
  expired: "bg-ink/10 text-ink/50",
  void: "bg-red-100 text-red-700",
};

export function VoucherRow({
  userRewardId,
  code,
  status,
  travellerName,
  travellerEmail,
  rewardTitle,
  discountType,
  discountValue,
  minBillMinor,
  claimedAt,
  redeemedAt,
  billAmountMinor,
  discountAmountMinor,
  voidReason,
}: {
  userRewardId: string;
  code: string;
  status: string;
  travellerName: string;
  travellerEmail: string;
  rewardTitle: string;
  discountType: RewardDiscountType;
  discountValue: string | null;
  minBillMinor: number | null;
  claimedAt: Date;
  redeemedAt: Date | null;
  billAmountMinor: number | null;
  discountAmountMinor: number | null;
  voidReason: string | null;
}) {
  const [state, formAction, pending] = useActionState(voidVoucherAction, initialState);
  const [voiding, setVoiding] = useState(false);
  const justVoided = !state.error && state !== initialState;

  return (
    <div className="border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono-data text-sm font-semibold text-ink">{code}</p>
            <span className={`eyebrow rounded-full px-2 py-0.5 text-[10px] ${STATUS_STYLE[status] ?? ""}`}>
              {justVoided ? "void" : status}
            </span>
          </div>
          <p className="text-sm text-ink">{rewardTitle}</p>
          <p className="text-xs text-ink/60">
            {travellerName} · {travellerEmail}
          </p>
          <p className="font-mono-data text-[11px] text-ink/40">
            {formatRewardDiscount(discountType, discountValue, minBillMinor)} · claimed {claimedAt.toLocaleDateString()}
            {redeemedAt && ` · redeemed ${redeemedAt.toLocaleString()}`}
            {billAmountMinor != null && ` · bill ${billAmountMinor.toLocaleString()} UGX`}
            {discountAmountMinor != null && ` · discount ${discountAmountMinor.toLocaleString()} UGX`}
          </p>
          {voidReason && <p className="mt-1 text-xs text-red-700">Voided: {voidReason}</p>}
        </div>
        {status === "claimed" && !justVoided && (
          <div className="flex-none">
            {!voiding ? (
              <button
                type="button"
                onClick={() => setVoiding(true)}
                className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                Void
              </button>
            ) : (
              <form action={formAction} className="flex items-center gap-2">
                <input type="hidden" name="userRewardId" value={userRewardId} />
                <input
                  name="reason"
                  required
                  placeholder="Reason (required)"
                  className="rounded-lg border border-ink/15 px-2 py-1.5 text-xs outline-none focus:border-ember"
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {pending ? "Voiding…" : "Confirm"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
      {state.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
    </div>
  );
}
