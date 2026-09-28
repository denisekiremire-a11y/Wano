import { getVendorApprovalQueue } from "@/lib/data/admin";
import { requireAdminPage } from "@/lib/auth";
import { withRlsContext } from "@/lib/db-context";
import { VendorRow } from "./vendor-row";

export default async function AdminVendorsPage() {
  const session = await requireAdminPage("/admin/vendors");
  const rows = await withRlsContext({ userId: session.userId, role: "admin" }, (tx) => getVendorApprovalQueue(tx));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink md:text-3xl">
          Business verification
        </h1>
        <p className="mt-1 text-sm text-ink/60">
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
