"use client";

import { useState } from "react";
import type { VisitorCheck } from "@/lib/actions/reward-actions";
import { RedeemVoucherPanel } from "@/app/vendor/dashboard/redeem/redeem-voucher-panel";
import { formatRewardDiscount, type RewardDiscountType } from "@/lib/reward-format";

/** Renders what a vendor sees after scanning a traveller's personal
 * "Wano QR" — a list of their claimable vouchers at this venue, each
 * expanding into the exact same RedeemVoucherPanel + PIN flow a single
 * voucher's own QR uses. No separate redemption logic. */
export function VisitorClaimableList({ check }: { check: VisitorCheck }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!check.ok) {
    return (
      <div className="border border-red-200 bg-red-50 p-5">
        <p className="eyebrow text-red-600">Can&apos;t read this QR</p>
        <p className="mt-1 text-sm text-red-700">It may have expired — ask the traveller to reopen it.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-ink/10 bg-white p-4">
        <p className="eyebrow text-ink/40">Visitor</p>
        <p className="font-serif-editorial text-xl text-ink">{check.travellerName}</p>
      </div>

      {check.claimable.length === 0 ? (
        <p className="text-sm text-ink/60">No claimable rewards for this traveller at your venue right now.</p>
      ) : (
        <div className="space-y-3">
          {check.claimable.map(({ userReward, reward }) => (
            <div key={userReward.id} className="border border-ink/10 bg-white">
              <button
                type="button"
                onClick={() => setOpenId((v) => (v === userReward.id ? null : userReward.id))}
                className="flex w-full items-center justify-between gap-3 p-4 text-left"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{reward.title}</p>
                  <p className="font-mono-data text-xs text-ember">
                    {formatRewardDiscount(reward.discountType as RewardDiscountType, reward.discountValue, reward.minBillMinor)}
                  </p>
                </div>
                <span className="flex-none text-xs font-semibold text-ember">
                  {openId === userReward.id ? "Hide" : "Redeem"}
                </span>
              </button>
              {openId === userReward.id && (
                <div className="border-t border-ink/10 p-4">
                  <RedeemVoucherPanel
                    check={{
                      ok: true,
                      travellerName: check.travellerName,
                      rewardTitle: reward.title,
                      discountType: reward.discountType,
                      discountValue: reward.discountValue,
                      minBillMinor: reward.minBillMinor,
                    }}
                    userRewardId={userReward.id}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
