import { getAllListingsForAdmin, getAllPromoCodes } from "@/lib/data/admin";
import { getJourneys } from "@/lib/data/journeys";
import { PromoForm } from "./promo-form";
import { PromoRow } from "./promo-row";

export default async function AdminPromotionsPage() {
  const [promos, journeys, listingOptions] = await Promise.all([
    getAllPromoCodes(),
    getJourneys(),
    getAllListingsForAdmin(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Promotions</h1>
        <p className="mt-1 text-sm text-forest-800/60">
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

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-forest-900">All promotions</h2>
        {promos.length === 0 ? (
          <p className="text-sm text-forest-800/60">No promotions yet.</p>
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
      </section>
    </div>
  );
}
