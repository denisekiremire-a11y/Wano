import { ClaimRewardButton } from "@/components/claim-reward-button";
import { VoucherCard } from "@/components/voucher-card";
import { formatRewardDiscount } from "@/lib/reward-format";
import type { getClaimableRewardsForTarget, getMyClaimedRewardsForTarget } from "@/lib/data/rewards";

export function TargetRewardsSection({
  claimable,
  claimed,
}: {
  claimable: Awaited<ReturnType<typeof getClaimableRewardsForTarget>>;
  claimed: Awaited<ReturnType<typeof getMyClaimedRewardsForTarget>>;
}) {
  const claimedRewardIds = new Set(claimed.map((c) => c.userReward.rewardId));
  const stillClaimable = claimable.filter((r) => !claimedRewardIds.has(r.id));

  if (claimed.length === 0 && stillClaimable.length === 0) return null;

  return (
    <section className="mt-8 rounded-2xl border border-forest-900/10 bg-white p-5">
      <h2 className="font-display text-lg font-semibold text-forest-900">Rewards</h2>
      <div className="mt-3 space-y-3">
        {claimed.map(({ userReward, reward }) => (
          <VoucherCard
            key={userReward.id}
            userRewardId={userReward.id}
            title={reward.title}
            discountLabel={formatRewardDiscount(reward.discountType, reward.discountValue)}
            redemptionCode={userReward.redemptionCode}
            expiresAt={userReward.expiresAt.toISOString()}
          />
        ))}
        {stillClaimable.map((reward) => (
          <div
            key={reward.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-forest-900/10 p-3"
          >
            <div>
              <p className="text-sm font-medium text-forest-900">{reward.title}</p>
              <p className="text-xs text-forest-800/60">
                {formatRewardDiscount(reward.discountType, reward.discountValue)}
              </p>
            </div>
            <ClaimRewardButton rewardId={reward.id} />
          </div>
        ))}
      </div>
    </section>
  );
}
