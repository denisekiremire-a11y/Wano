import { getAllRewardsForAdmin, getRedemptionQueueForAdmin } from "@/lib/data/rewards";
import { RewardForm } from "./reward-form";
import { RewardRow } from "./reward-row";
import { RedemptionRow } from "./redemption-row";

export default async function AdminRewardsPage() {
  const [rewardsList, redemptions] = await Promise.all([
    getAllRewardsForAdmin(),
    getRedemptionQueueForAdmin(),
  ]);

  const pendingCount = redemptions.filter((r) => r.redemption.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Rewards</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Things travellers can redeem their points for. Points are earned automatically from
          stamps, challenges, reviews, and referrals — this catalog is just what they can spend
          them on.
        </p>
      </div>

      <RewardForm />

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-forest-900">Catalog</h2>
        {rewardsList.length === 0 ? (
          <p className="text-sm text-forest-800/60">No rewards yet — add one above.</p>
        ) : (
          rewardsList.map((reward) => (
            <RewardRow
              key={reward.id}
              rewardId={reward.id}
              title={reward.title}
              description={reward.description}
              pointsCost={reward.pointsCost}
              stock={reward.stock}
              active={reward.active}
            />
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-forest-900">
          Redemption queue {pendingCount > 0 && `(${pendingCount} pending)`}
        </h2>
        {redemptions.length === 0 ? (
          <p className="text-sm text-forest-800/60">No redemptions yet.</p>
        ) : (
          redemptions.map(({ redemption, reward, traveller }) => (
            <RedemptionRow
              key={redemption.id}
              redemptionId={redemption.id}
              travellerName={traveller.displayName}
              rewardTitle={reward.title}
              pointsSpent={redemption.pointsSpent}
              status={redemption.status}
              createdAt={redemption.createdAt.toLocaleDateString()}
            />
          ))
        )}
      </section>
    </div>
  );
}
