import Link from "next/link";
import { getVendorListings, getVendorProfileByUserId } from "@/lib/data/vendor";
import { getVendorRewards } from "@/lib/data/rewards";
import { getSubmissionsForVendor } from "@/lib/data/submissions";
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

  const [listingRows, rewardRows, submissions] = await Promise.all([
    getVendorListings(vendorProfile.id),
    getVendorRewards(vendorProfile.id),
    getSubmissionsForVendor(vendorProfile.id),
  ]);
  const status = statusCopy[vendorProfile.accreditationStatus];
  const pendingSubmissions = submissions.filter((s) => s.status === "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-900">{vendorProfile.businessName}</h1>
          <p className="mt-1 text-sm text-forest-800/60">{vendorProfile.location}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
      </div>

      {vendorProfile.accreditationStatus === "pending" && (
        <div className="rounded-xl border border-marigold-300 bg-marigold-50 p-4 text-sm text-marigold-900">
          Your verification is under review by the Wano team. Your listings won&apos;t appear publicly until
          it&apos;s approved.{" "}
          <Link href="/vendor/dashboard/documents" className="font-medium underline">
            Submit KYC documents
          </Link>{" "}
          to speed up review.
        </div>
      )}

      {pendingSubmissions.length > 0 && (
        <div className="rounded-xl border border-marigold-300 bg-marigold-50 p-4 text-sm text-marigold-900">
          {pendingSubmissions.length} {pendingSubmissions.length === 1 ? "submission is" : "submissions are"}{" "}
          waiting on Wano team review.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/vendor/dashboard/listings"
          className="rounded-2xl border border-forest-900/10 bg-white p-5 transition hover:border-forest-900/20"
        >
          <p className="text-2xl font-semibold text-forest-900">{listingRows.length}</p>
          <p className="text-sm text-forest-800/60">
            {listingRows.length === 1 ? "Listing" : "Listings"} — manage →
          </p>
        </Link>
        <Link
          href="/vendor/dashboard/rewards"
          className="rounded-2xl border border-forest-900/10 bg-white p-5 transition hover:border-forest-900/20"
        >
          <p className="text-2xl font-semibold text-forest-900">{rewardRows.length}</p>
          <p className="text-sm text-forest-800/60">
            {rewardRows.length === 1 ? "Reward" : "Rewards"} — manage →
          </p>
        </Link>
        <Link
          href="/vendor/dashboard/posts"
          className="rounded-2xl border border-forest-900/10 bg-white p-5 transition hover:border-forest-900/20"
        >
          <p className="text-2xl font-semibold text-forest-900">📣</p>
          <p className="text-sm text-forest-800/60">Post an update →</p>
        </Link>
      </div>

      {listingRows.length === 0 && (
        <p className="rounded-xl border border-forest-900/10 bg-white p-5 text-sm text-forest-800/60">
          You don&apos;t have any listings yet.{" "}
          <Link href="/vendor/dashboard/listings/new" className="font-medium text-nile-700 hover:underline">
            Create your first listing
          </Link>{" "}
          — it&apos;ll go live once the Wano team reviews it.
        </p>
      )}
    </div>
  );
}
