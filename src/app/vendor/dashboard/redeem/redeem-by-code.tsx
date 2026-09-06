"use client";

import { useState, useTransition } from "react";
import { lookupRewardByCodeForVendor, type RedeemCheck } from "@/lib/actions/reward-actions";
import { RedeemVoucherPanel } from "./redeem-voucher-panel";

export function RedeemByCode() {
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ check: RedeemCheck; userRewardId?: string } | null>(null);

  function lookup() {
    if (!code.trim()) return;
    startTransition(async () => {
      const check = await lookupRewardByCodeForVendor(code);
      setResult({ check, userRewardId: check.userRewardId });
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <div>
          <label className="text-sm font-medium text-forest-900">Redemption code</label>
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setResult(null);
            }}
            placeholder="e.g. AB2CD3FG"
            className="mt-1 w-40 rounded-lg border border-forest-900/15 px-3 py-2 text-sm uppercase outline-none focus:border-forest-600"
          />
        </div>
        <button
          type="button"
          onClick={lookup}
          disabled={pending || !code.trim()}
          className="rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
        >
          {pending ? "Looking up…" : "Look up"}
        </button>
      </div>
      {result && <RedeemVoucherPanel check={result.check} userRewardId={result.userRewardId} />}
    </div>
  );
}
