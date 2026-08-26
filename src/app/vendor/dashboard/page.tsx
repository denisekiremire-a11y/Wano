import Link from "next/link";
import { JourneyArt } from "@/components/journey-art";
import { OfferTeaser } from "@/components/offer-teaser";
import { getVendorListingFull, getVendorProfileByUserId } from "@/lib/data/vendor";
import { journeyTheme } from "@/lib/journey-theme";
import { listingTypeLabels } from "@/lib/listing-type";
import { getSession } from "@/lib/session";

const statusCopy = {
  trusted: {
    label: "Wano Verified Business",
    className: "bg-forest-100 text-forest-800",
  },
  pending: {
    label: "Pending review",
    className: "bg-marigold-100 text-marigold-800",
  },
  rejected: {
    label: "Not verified",
    className: "bg-red-100 text-red-700",
  },
} as const;

export default async function VendorDashboardPage() {
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const listingRow = await getVendorListingFull(vendorProfile.id);
  const status = statusCopy[vendorProfile.accreditationStatus];
  const artSlug = listingRow?.journeyTags[0]?.slug ?? "relax-unwind";
  const theme = journeyTheme(artSlug);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-900">
            {vendorProfile.businessName}
          </h1>
          <p className="mt-1 text-sm text-forest-800/60">
            {listingRow ? listingTypeLabels[listingRow.listing.type] : "No listing type set yet"}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
      </div>

      {vendorProfile.accreditationStatus === "pending" && (
        <div className="rounded-xl border border-marigold-300 bg-marigold-50 p-4 text-sm text-marigold-900">
          Your verification is under review by the Wano team. Your listing won&apos;t appear publicly
          until it&apos;s approved.{" "}
          <Link href="/vendor/dashboard/documents" className="font-medium underline">
            Submit KYC documents
          </Link>{" "}
          to speed up review.
        </div>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-forest-900">
            Your listing preview
          </h2>
          <Link href="/vendor/dashboard/offer" className="text-sm font-medium text-nile-700">
            Edit offer →
          </Link>
        </div>
        <p className="mb-3 text-xs text-forest-800/50">This is what Wano members see.</p>

        {listingRow ? (
          <div className="overflow-hidden rounded-2xl border border-forest-900/10 bg-white">
            <div className={`h-16 overflow-hidden bg-gradient-to-br ${theme.gradient}`}>
              <JourneyArt slug={artSlug} className="h-full w-full" />
            </div>
            <div className="p-5 sm:flex sm:items-start sm:justify-between sm:gap-6">
              <div className="flex-1">
                <p className="font-display text-lg font-semibold text-forest-900">
                  {listingRow.listing.title}
                </p>
                <p className="text-sm text-forest-800/70">{vendorProfile.businessName}</p>
                <p className="mt-1 text-sm text-forest-800/60">{listingRow.listing.description}</p>
                <p className="mt-2 text-sm font-medium text-nile-700">
                  {listingRow.listing.priceHint}
                </p>
                {listingRow.journeyTags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {listingRow.journeyTags.map((j) => (
                      <span
                        key={j.id}
                        className="rounded-full bg-forest-50 px-2 py-0.5 text-[11px] font-medium text-forest-700"
                      >
                        {j.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-4 sm:mt-0 sm:w-64">
                {listingRow.offer && (
                  <OfferTeaser
                    discountText={listingRow.offer.discountText}
                    freebieText={listingRow.offer.freebieText}
                    unlocked
                    unlockHint=""
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-forest-900/10 bg-white p-5 text-sm text-forest-800/60">
            No listing yet — once your KYC documents are approved, the Wano team will set up your
            first listing.
          </p>
        )}
      </section>
    </div>
  );
}
