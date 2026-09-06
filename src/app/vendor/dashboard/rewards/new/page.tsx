import { getVendorListings, getVendorProfileByUserId } from "@/lib/data/vendor";
import { getSession } from "@/lib/session";
import { VendorRewardForm } from "../vendor-reward-form";

export default async function NewVendorRewardPage() {
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const listingRows = await getVendorListings(vendorProfile.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">New reward</h1>
        <p className="mt-1 text-sm text-forest-800/60">A voucher members can claim on one of your listings.</p>
      </div>

      {listingRows.length === 0 ? (
        <p className="rounded-xl border border-forest-900/10 bg-white p-5 text-sm text-forest-800/60">
          You need at least one listing before you can create a reward.
        </p>
      ) : (
        <VendorRewardForm listingOptions={listingRows.map(({ listing }) => ({ id: listing.id, title: listing.title }))} />
      )}
    </div>
  );
}
