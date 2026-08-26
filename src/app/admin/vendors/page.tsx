import { getVendorApprovalQueue } from "@/lib/data/admin";
import { VendorRow } from "./vendor-row";

export default async function AdminVendorsPage() {
  const rows = await getVendorApprovalQueue();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">
          Business verification
        </h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Review KYC documents and onboard businesses. Open a business to verify documents, set up
          their listing, and approve or reject verification.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map(({ vendor, user, listing, journeyTags, pendingDocCount }) => (
          <VendorRow
            key={vendor.id}
            vendorProfileId={vendor.id}
            businessName={vendor.businessName}
            contactEmail={user.email}
            location={vendor.location}
            status={vendor.accreditationStatus}
            listingType={listing?.type ?? null}
            journeyNames={journeyTags.map((j) => j.name)}
            pendingDocCount={pendingDocCount}
          />
        ))}
      </div>
    </div>
  );
}
