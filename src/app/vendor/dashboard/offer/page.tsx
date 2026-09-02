import { formatListingPrice } from "@/lib/currency";
import { getVendorListingFull, getVendorProfileByUserId } from "@/lib/data/vendor";
import { journeyTheme } from "@/lib/journey-theme";
import { getSession } from "@/lib/session";
import { OfferEditor } from "./offer-editor";

export default async function VendorOfferPage() {
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const listingRow = await getVendorListingFull(vendorProfile.id);

  if (!listingRow) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Your offer</h1>
        <p className="mt-3 text-sm text-forest-800/60">
          You don&apos;t have a listing yet — contact Wano to have your first listing set up.
        </p>
      </div>
    );
  }

  const artSlug = listingRow.journeyTags[0]?.slug ?? "relax-unwind";
  const theme = journeyTheme(artSlug);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Your offer</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          {listingRow.journeyTags.length > 0
            ? "This discount and freebie unlock for travellers once they earn the stamp for a journey you're tagged on."
            : "This discount and freebie is visible to any member browsing your listing."}
        </p>
      </div>

      <OfferEditor
        listingId={listingRow.listing.id}
        listingTitle={listingRow.listing.title}
        businessName={vendorProfile.businessName}
        priceHint={formatListingPrice(listingRow.listing)}
        gradient={theme.gradient}
        artSlug={artSlug}
        initialDiscountText={listingRow.offer?.discountText ?? ""}
        initialFreebieText={listingRow.offer?.freebieText ?? ""}
        initialActive={listingRow.offer?.active ?? true}
      />
    </div>
  );
}
