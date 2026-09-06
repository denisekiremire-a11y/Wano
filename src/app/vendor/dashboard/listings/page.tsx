import Link from "next/link";
import { formatListingPrice } from "@/lib/currency";
import { getVendorListings, getVendorProfileByUserId } from "@/lib/data/vendor";
import { getSubmissionsForVendor } from "@/lib/data/submissions";
import { listingTypeLabels } from "@/lib/listing-type";
import { getSession } from "@/lib/session";
import { WithdrawSubmissionButton } from "./withdraw-submission-button";
import { ListingActiveToggle } from "./listing-active-toggle";

export default async function VendorListingsPage() {
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const [listingRows, submissions] = await Promise.all([
    getVendorListings(vendorProfile.id),
    getSubmissionsForVendor(vendorProfile.id),
  ]);

  const pendingByListing = new Map(
    submissions.filter((s) => s.status === "pending" && s.entityId).map((s) => [s.entityId as string, s]),
  );
  const newListingSubmissions = submissions.filter((s) => s.entityId === null);
  const rejected = submissions.filter((s) => s.status === "rejected");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-900">Your listings</h1>
          <p className="mt-1 text-sm text-forest-800/60">
            Edits and new listings go to the Wano team for review before they go live.
          </p>
        </div>
        <Link
          href="/vendor/dashboard/listings/new"
          className="rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700"
        >
          + New listing
        </Link>
      </div>

      {newListingSubmissions.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-forest-900">Awaiting review</h2>
          {newListingSubmissions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-marigold-300 bg-marigold-50 p-4"
            >
              <div>
                <p className="text-sm font-medium text-forest-900">
                  {typeof s.payload.title === "string" ? s.payload.title : "New listing"}
                </p>
                <p className="text-xs text-marigold-800">
                  {s.status === "pending" ? "Submitted — waiting on the Wano team." : s.status}
                </p>
              </div>
              {s.status === "pending" && <WithdrawSubmissionButton submissionId={s.id} kind="listing" />}
            </div>
          ))}
        </section>
      )}

      {rejected.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-forest-900">Needs changes</h2>
          {rejected.map((s) => (
            <div key={s.id} className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-forest-900">
                {typeof s.payload.title === "string" ? s.payload.title : "Submission"}
              </p>
              <p className="mt-0.5 text-xs text-red-700">{s.reviewNotes || "Not approved this time."}</p>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-3">
        {listingRows.length === 0 ? (
          <p className="rounded-xl border border-forest-900/10 bg-white p-5 text-sm text-forest-800/60">
            You don&apos;t have any listings yet.
          </p>
        ) : (
          listingRows.map(({ listing, offer }) => {
            const pending = pendingByListing.get(listing.id);
            return (
              <div key={listing.id} className="rounded-2xl border border-forest-900/10 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-semibold text-forest-900">{listing.title}</p>
                    <p className="text-xs text-forest-800/50">{listingTypeLabels[listing.type]}</p>
                    <p className="mt-1 text-sm text-forest-800/60 line-clamp-2">{listing.description}</p>
                    <p className="mt-1 text-sm font-medium text-nile-700">{formatListingPrice(listing)}</p>
                    {offer && <p className="mt-1 text-xs text-marigold-800">{offer.discountText}</p>}
                  </div>
                  <div className="flex flex-none flex-col items-end gap-2">
                    <ListingActiveToggle listingId={listing.id} active={listing.active} />
                    <Link
                      href={`/vendor/dashboard/listings/${listing.id}`}
                      className="text-sm font-medium text-nile-700 hover:underline"
                    >
                      Edit →
                    </Link>
                  </div>
                </div>
                {pending && (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-marigold-50 px-3 py-2 text-xs text-marigold-900">
                    <span>An edit is waiting on Wano team review — this page still shows what&apos;s live.</span>
                    <WithdrawSubmissionButton submissionId={pending.id} kind="listing" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
