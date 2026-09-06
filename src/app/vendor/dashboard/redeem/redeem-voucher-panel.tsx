"use client";

import { useActionState } from "react";
import { markRewardRedeemedAction, type RedeemCheck } from "@/lib/actions/reward-actions";
import { formatRewardDiscount } from "@/lib/reward-format";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

const REJECTION_COPY: Record<Exclude<RedeemCheck, { ok: true }>["reason"], string> = {
  invalid: "Voucher not found. Double-check the code or ask the traveller to reopen their QR.",
  already_redeemed: "This voucher has already been redeemed.",
  expired: "This voucher has expired.",
  wrong_venue: "This voucher isn't for your venue.",
  void: "This voucher was voided and can't be redeemed.",
};

export function RedeemVoucherPanel({ check, userRewardId }: { check: RedeemCheck; userRewardId?: string }) {
  const [state, formAction, pending] = useActionState(markRewardRedeemedAction, initialState);
  const justRedeemed = !state.error && state !== initialState;

  if (!check.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <p className="text-sm font-semibold text-red-800">Can&apos;t redeem this voucher</p>
        <p className="mt-1 text-sm text-red-700">
          {REJECTION_COPY[check.reason]}
          {check.reason === "already_redeemed" && check.detail ? ` (${check.detail})` : ""}
        </p>
      </div>
    );
  }

  if (justRedeemed) {
    return (
      <div className="rounded-2xl border border-forest-300 bg-forest-50 p-5 text-center">
        <p className="text-sm font-semibold text-forest-900">Redeemed</p>
        <p className="mt-1 text-sm text-forest-800/70">
          {check.rewardTitle} for {check.travellerName}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-forest-900/10 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-forest-800/50">Redeeming for</p>
      <p className="mt-1 font-display text-xl font-semibold text-forest-900">{check.travellerName}</p>
      <p className="mt-2 text-sm text-forest-800/80">{check.rewardTitle}</p>
      <p className="text-sm font-semibold text-forest-800">
        {formatRewardDiscount(check.discountType as "percent" | "fixed" | "freebie", check.discountValue)}
      </p>

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
        <input type="hidden" name="userRewardId" value={userRewardId} />
        <div>
          <label className="text-sm font-medium text-forest-900">Venue PIN</label>
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            required
            className="mt-1 w-32 rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-marigold-500 px-4 py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-marigold-400 disabled:opacity-60"
        >
          {pending ? "Checking…" : "Mark redeemed"}
        </button>
        {state.error && <p className="w-full text-xs text-red-700">{state.error}</p>}
      </form>
    </div>
  );
}
