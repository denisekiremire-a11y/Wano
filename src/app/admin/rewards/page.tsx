import { getAllEventsForAdmin, getAllListingsForAdmin, getAllPromoCodes } from "@/lib/data/admin";
import { getAllRewardsForAdmin } from "@/lib/data/rewards";
import { getJourneys } from "@/lib/data/journeys";
import { requireAdminPage } from "@/lib/auth";
import { withRlsContext } from "@/lib/db-context";
import { PromoForm } from "../promotions/promo-form";
import { PromoRow } from "../promotions/promo-row";
import { RewardForm } from "./reward-form";
import { RewardRow } from "./reward-row";
import { SeedRewardsButton } from "./seed-rewards-button";

export default async function AdminRewardsPage() {
  const session = await requireAdminPage("/admin/rewards");
  const [rewardsList, listingOptions, eventOptions, promos, journeys] = await Promise.all([
    withRlsContext({ userId: session.userId, role: "admin" }, (tx) => getAllRewardsForAdmin(tx)),
    getAllListingsForAdmin(),
    getAllEventsForAdmin(),
    getAllPromoCodes(),
    getJourneys(),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink">Rewards &amp; deals</h1>
        <p className="mt-1 text-sm text-ink/60">
          Everything a traveller can claim or redeem across the platform — QR reward vouchers and
          Wano Deals — in one place.
        </p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="font-serif-editorial text-lg text-ink">Rewards</h2>
          <p className="mt-1 text-sm text-ink/60">
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

        <div className="space-y-3">
          <h3 className="eyebrow text-ink/40">Catalog</h3>
          {rewardsList.length === 0 ? (
            <p className="text-sm text-ink/60">No rewards yet — add one above.</p>
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
                pointsCost={reward.pointsCost}
                targetLabel={reward.target?.title ?? "Unknown target"}
                active={reward.active}
              />
            ))
          )}
        </div>
      </section>

      <section className="space-y-4 border-t border-ink/10 pt-8">
        <div>
          <h2 className="font-serif-editorial text-lg text-ink">Deals</h2>
          <p className="mt-1 text-sm text-ink/60">
            Platform-wide, journey-wide, or place-specific Wano Deals — independent of any
            business&apos;s own offer. Any place can have its own promotion.
          </p>
        </div>

        <PromoForm
          journeys={journeys.map((j) => ({ id: j.id, name: j.name }))}
          listingOptions={listingOptions.map((l) => ({
            id: l.listing.id,
            title: l.listing.title,
            businessName: l.vendor.businessName,
          }))}
        />

        <div className="space-y-3">
          <h3 className="eyebrow text-ink/40">All deals</h3>
          {promos.length === 0 ? (
            <p className="text-sm text-ink/60">No deals yet.</p>
          ) : (
            promos.map(({ promo, journey, listing, vendor }) => (
              <PromoRow
                key={promo.id}
                promoId={promo.id}
                code={promo.code}
                title={promo.title}
                discountText={promo.discountText}
                freebieText={promo.freebieText}
                scopeLabel={
                  listing
                    ? `${listing.title}${vendor ? ` (${vendor.businessName})` : ""}`
                    : journey
                      ? `Requires the ${journey.name} stamp`
                      : "Platform-wide"
                }
                active={promo.active}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
