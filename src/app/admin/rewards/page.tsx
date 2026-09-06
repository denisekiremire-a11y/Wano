import { getAllEventsForAdmin, getAllListingsForAdmin } from "@/lib/data/admin";
import { getAllRewardsForAdmin } from "@/lib/data/rewards";
import { RewardForm } from "./reward-form";
import { RewardRow } from "./reward-row";
import { SeedRewardsButton } from "./seed-rewards-button";

export default async function AdminRewardsPage() {
  const [rewardsList, listingOptions, eventOptions] = await Promise.all([
    getAllRewardsForAdmin(),
    getAllListingsForAdmin(),
    getAllEventsForAdmin(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Rewards</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Discount vouchers attached to a specific place or event, redeemed in person via QR at
          the venue. Fun Zone, XP draw, and referral vouchers are minted automatically by those
          flows — this catalog is for campaign and manual rewards travellers can claim directly.
        </p>
      </div>

      <SeedRewardsButton />

      <RewardForm
        listingOptions={listingOptions.map((l) => ({
          id: l.listing.id,
          title: l.listing.title,
          businessName: l.vendor.businessName,
        }))}
        eventOptions={eventOptions.map((e) => ({ id: e.id, title: e.title }))}
      />

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
              discountType={reward.discountType}
              discountValue={reward.discountValue}
              source={reward.source}
              targetLabel={reward.target?.title ?? "Unknown target"}
              active={reward.active}
            />
          ))
        )}
      </section>
    </div>
  );
}
