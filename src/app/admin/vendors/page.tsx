import { getVendorApprovalQueue } from "@/lib/data/admin";
import { requireAdminPage } from "@/lib/auth";
import { withRlsContext } from "@/lib/db-context";
import { listingTypeLabels, type ListingType } from "@/lib/listing-type";
import { VendorRow } from "./vendor-row";

const categoryOptions = Object.keys(listingTypeLabels) as ListingType[];
const NO_LISTING = "none";

export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const session = await requireAdminPage("/admin/vendors");
  const { category } = await searchParams;
  const rows = await withRlsContext({ userId: session.userId, role: "admin" }, (tx) => getVendorApprovalQueue(tx));

  const categoryCounts = Object.fromEntries(
    categoryOptions.map((c) => [c, rows.filter((r) => r.listing?.type === c).length]),
  ) as Record<ListingType, number>;
  const noListingCount = rows.filter((r) => !r.listing).length;

  const filtered = rows.filter((r) => {
    if (!category) return true;
    if (category === NO_LISTING) return !r.listing;
    return r.listing?.type === category;
  });

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

      <div>
        <p className="eyebrow mb-2 text-ink/40">Category</p>
        <div className="flex flex-wrap gap-2">
          {categoryOptions
            .filter((c) => categoryCounts[c] > 0)
            .map((c) => (
              <a
                key={c}
                href={category === c ? "/admin/vendors" : `/admin/vendors?category=${c}`}
                className={`border px-3 py-1.5 text-sm transition-colors ${
                  category === c
                    ? "border-ink bg-ink text-white"
                    : "border-ink/15 text-ink/70 hover:border-ink/40"
                }`}
              >
                {listingTypeLabels[c]}{" "}
                <span className="font-mono-data text-xs opacity-70">{categoryCounts[c]}</span>
              </a>
            ))}
          {noListingCount > 0 && (
            <a
              href={category === NO_LISTING ? "/admin/vendors" : `/admin/vendors?category=${NO_LISTING}`}
              className={`border px-3 py-1.5 text-sm transition-colors ${
                category === NO_LISTING
                  ? "border-ink bg-ink text-white"
                  : "border-ink/15 text-ink/70 hover:border-ink/40"
              }`}
            >
              No listing yet{" "}
              <span className="font-mono-data text-xs opacity-70">{noListingCount}</span>
            </a>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="border border-ink/10 bg-white p-6 text-center text-sm text-ink/50">
            No businesses match.
          </p>
        ) : (
          filtered.map(({ vendor, user, listing, journeyTags, pendingDocCount }) => (
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
          ))
        )}
      </div>
    </div>
  );
}
