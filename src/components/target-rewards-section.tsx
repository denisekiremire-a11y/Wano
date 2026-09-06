import { ClaimRewardButton } from "@/components/claim-reward-button";
import { VoucherCard } from "@/components/voucher-card";
import { formatRewardDiscount } from "@/lib/reward-format";
import type { getClaimableRewardsForTarget, getMyClaimedRewardsForTarget } from "@/lib/data/rewards";

type VendorOffer = { discountText: string; freebieText: string | null } | null;
type WanoDeal = { code: string; discountText: string } | null;

export function TargetRewardsSection({
  claimable,
  claimed,
  offer,
  promo,
}: {
  claimable: Awaited<ReturnType<typeof getClaimableRewardsForTarget>>;
  claimed: Awaited<ReturnType<typeof getMyClaimedRewardsForTarget>>;
  offer?: VendorOffer;
  promo?: WanoDeal;
}) {
  const claimedRewardIds = new Set(claimed.map((c) => c.userReward.rewardId));
  const stillClaimable = claimable.filter((r) => !claimedRewardIds.has(r.id));

  if (claimed.length === 0 && stillClaimable.length === 0 && !offer && !promo) return null;

  return (
    <section className="mt-8 rounded-2xl border border-forest-900/10 bg-white p-5">
      <h2 className="font-display text-lg font-semibold text-forest-900">Rewards</h2>
      <div className="mt-3 space-y-3">
        {offer && (
          <div className="rounded-xl bg-forest-50 px-4 py-3">
            <p className="text-sm font-medium text-forest-900">{offer.discountText}</p>
            {offer.freebieText && <p className="text-sm text-forest-800/70">{offer.freebieText}</p>}
          </div>
        )}
        {promo && (
          <div className="rounded-xl bg-marigold-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-marigold-700">Wano Deal</p>
            <p className="text-sm font-medium text-marigold-900">
              {promo.code} — {promo.discountText}
            </p>
          </div>
        )}
        {claimed.map(({ userReward, reward }) => (
          <VoucherCard
            key={userReward.id}
            userRewardId={userReward.id}
            title={reward.title}
            discountLabel={formatRewardDiscount(reward.discountType, reward.discountValue)}
            redemptionCode={userReward.redemptionCode}
            expiresAt={userReward.expiresAt.toISOString()}
            isXpPrize={reward.source === "xp_draw"}
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
