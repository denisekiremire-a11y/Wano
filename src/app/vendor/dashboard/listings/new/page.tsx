import { getJourneys } from "@/lib/data/journeys";
import { getVendorProfileByUserId } from "@/lib/data/vendor";
import { getSession } from "@/lib/session";
import { VendorListingForm } from "../vendor-listing-form";

export default async function NewVendorListingPage() {
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const journeys = await getJourneys();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">New listing</h1>
        <p className="mt-1 text-sm text-forest-800/60">Tell us about the place or experience — we&apos;ll review it before it goes live.</p>
      </div>

      <VendorListingForm
        journeys={journeys.map((j) => ({ id: j.id, name: j.name }))}
        vendorSocials={{
          instagramUrl: vendorProfile.instagramUrl,
          facebookUrl: vendorProfile.facebookUrl,
          tiktokUrl: vendorProfile.tiktokUrl,
          websiteUrl: vendorProfile.websiteUrl,
        }}
      />
    </div>
  );
}
