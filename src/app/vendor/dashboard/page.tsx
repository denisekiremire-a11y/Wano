import Link from "next/link";
import { getVendorListings, getVendorProfileByUserId } from "@/lib/data/vendor";
import { getVendorRewards } from "@/lib/data/rewards";
import { getSubmissionsForVendor } from "@/lib/data/submissions";
import { withRlsContext } from "@/lib/db-context";
import { getSession } from "@/lib/session";

const statusCopy = {
  trusted: {
    label: "Wano Verified Business",
    className: "text-ink",
  },
  pending: {
    label: "Pending review",
    className: "text-ember",
  },
  rejected: {
    label: "Not verified",
    className: "text-red-600",
  },
} as const;

export default async function VendorDashboardPage() {
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const [listingRows, [rewardRows, submissions]] = await Promise.all([
    getVendorListings(vendorProfile.id),
    withRlsContext({ userId: session!.userId, role: "vendor", vendorProfileId: vendorProfile.id }, (tx) =>
      Promise.all([getVendorRewards(vendorProfile.id, tx), getSubmissionsForVendor(vendorProfile.id, tx)]),
    ),
  ]);
  const status = statusCopy[vendorProfile.accreditationStatus];
  const pendingSubmissions = submissions.filter((s) => s.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif-editorial text-2xl text-ink">{vendorProfile.businessName}</h1>
          <p className="mt-1 text-sm text-ink/60">{vendorProfile.location}</p>
        </div>
        <span className={`eyebrow ${status.className}`}>{status.label}</span>
      </div>

      {vendorProfile.accreditationStatus === "pending" && (
        <div className="border border-ink/10 bg-white p-4 text-sm text-ink/70">
          Your verification is under review by the Wano team. Your listings won&apos;t appear publicly until
          it&apos;s approved.{" "}
          <Link href="/vendor/dashboard/documents" className="font-medium text-ember underline">
            Submit KYC documents
          </Link>{" "}
          to speed up review.
        </div>
      )}

      {pendingSubmissions.length > 0 && (
        <div className="border border-ink/10 bg-white p-4 text-sm text-ink/70">
          {pendingSubmissions.length} {pendingSubmissions.length === 1 ? "submission is" : "submissions are"}{" "}
          waiting on Wano team review.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/vendor/dashboard/listings"
          className="border border-ink/10 bg-white p-5 transition-colors hover:border-ink/25"
        >
          <p className="font-mono-data text-2xl font-semibold text-ink">{listingRows.length}</p>
          <p className="text-sm text-ink/60">
            {listingRows.length === 1 ? "Listing" : "Listings"} — manage →
          </p>
        </Link>
        <Link
          href="/vendor/dashboard/rewards"
          className="border border-ink/10 bg-white p-5 transition-colors hover:border-ink/25"
        >
          <p className="font-mono-data text-2xl font-semibold text-ink">{rewardRows.length}</p>
          <p className="text-sm text-ink/60">
            {rewardRows.length === 1 ? "Reward" : "Rewards"} — manage →
          </p>
        </Link>
        <Link
          href="/vendor/dashboard/posts"
          className="border border-ink/10 bg-white p-5 transition-colors hover:border-ink/25"
        >
          <p className="font-serif-editorial text-2xl text-ink">Post</p>
          <p className="text-sm text-ink/60">Share an update →</p>
        </Link>
      </div>

      {listingRows.length === 0 && (
        <p className="border border-ink/10 bg-white p-5 text-sm text-ink/60">
          You don&apos;t have any listings yet.{" "}
          <Link href="/vendor/dashboard/listings/new" className="font-medium text-ember hover:underline">
            Create your first listing
          </Link>{" "}
          — it&apos;ll go live once the Wano team reviews it.
        </p>
      )}
    </div>
  );
}
