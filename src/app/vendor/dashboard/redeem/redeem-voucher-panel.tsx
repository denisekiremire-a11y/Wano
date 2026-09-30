"use client";

import { useActionState } from "react";
import { markRewardRedeemedAction, type RedeemCheck } from "@/lib/actions/reward-actions";
import { formatRewardDiscount, type RewardDiscountType } from "@/lib/reward-format";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

const REJECTION_COPY: Record<Exclude<RedeemCheck, { ok: true }>["reason"], string> = {
  invalid: "Voucher not found. Double-check the code or ask the traveller to reopen their QR.",
  already_redeemed: "This voucher has already been redeemed.",
  expired: "This voucher has expired.",
  wrong_venue: "This voucher isn't for your venue.",
  void: "This voucher was voided and can't be redeemed.",
  not_active: "This reward isn't currently active.",
};

// Which discount types need the bill amount entered at redemption:
// "percent" turns a percentage into an actual amount, "spend_perk" also
// needs it to check the minimum bill. "fixed"/"freebie"/"points" don't.
const NEEDS_BILL_AMOUNT = new Set(["percent", "spend_perk"]);

export function RedeemVoucherPanel({ check, userRewardId }: { check: RedeemCheck; userRewardId?: string }) {
  const [state, formAction, pending] = useActionState(markRewardRedeemedAction, initialState);
  const justRedeemed = !state.error && state !== initialState;

  if (!check.ok) {
    return (
      <div className="border border-red-200 bg-red-50 p-5">
        <p className="eyebrow text-red-600">Can&apos;t redeem this voucher</p>
        <p className="mt-1 text-sm text-red-700">
          {REJECTION_COPY[check.reason]}
          {check.reason === "already_redeemed" && check.detail ? ` (${check.detail})` : ""}
        </p>
      </div>
    );
  }

  if (justRedeemed) {
    return (
      <div className="border border-ink/10 bg-ink/5 p-5 text-center">
        <p className="eyebrow text-ink">Redeemed</p>
        <p className="mt-1 text-sm text-ink/70">
          {check.rewardTitle} for {check.travellerName}.
        </p>
      </div>
    );
  }

  const needsBill = NEEDS_BILL_AMOUNT.has(check.discountType);

  return (
    <div className="border border-ink/10 bg-white p-5">
      <p className="eyebrow text-ink/40">Redeeming for</p>
      <p className="font-serif-editorial mt-1 text-xl text-ink">{check.travellerName}</p>
      <p className="mt-2 text-sm text-ink/70">{check.rewardTitle}</p>
      <p className="font-mono-data text-sm font-semibold text-ember">
        {formatRewardDiscount(check.discountType as RewardDiscountType, check.discountValue, check.minBillMinor)}
      </p>

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="userRewardId" value={userRewardId} />
        {needsBill && (
          <div>
            <label className="text-sm font-medium text-ink">Bill amount (UGX)</label>
            <input
              name="billAmountMinor"
              type="number"
              inputMode="numeric"
              min={0}
              required
              placeholder={check.minBillMinor ? String(check.minBillMinor) : "50000"}
              className="mt-1 w-36 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
            />
          </div>
        )}
        <div>
          <label className="text-sm font-medium text-ink">Venue PIN</label>
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            required
            className="mt-1 w-32 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60"
        >
          {pending ? "Checking…" : "Mark redeemed"}
        </button>
        {state.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
      </form>
    </div>
  );
}
