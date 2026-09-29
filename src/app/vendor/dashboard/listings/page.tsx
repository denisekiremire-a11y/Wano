import Link from "next/link";
import { formatListingPrice } from "@/lib/currency";
import { getVendorListings, getVendorProfileByUserId } from "@/lib/data/vendor";
import { getSubmissionsForVendor } from "@/lib/data/submissions";
import { withRlsContext } from "@/lib/db-context";
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
    withRlsContext({ userId: session!.userId, role: "vendor", vendorProfileId: vendorProfile.id }, (tx) =>
      getSubmissionsForVendor(vendorProfile.id, tx),
    ),
  ]);

  const pendingByListing = new Map(
    submissions.filter((s) => s.status === "pending" && s.entityId).map((s) => [s.entityId as string, s]),
  );
  const newListingSubmissions = submissions.filter((s) => s.entityId === null);
  const rejected = submissions.filter((s) => s.status === "rejected");

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-ember">Vendor dashboard</p>
          <h1 className="font-serif-editorial mt-2 text-2xl text-ink md:text-3xl">Your listings</h1>
          <p className="mt-1 text-sm text-ink/60">
            Edits and new listings go to the Wano team for review before they go live.
          </p>
        </div>
        <Link
          href="/vendor/dashboard/listings/new"
          className="inline-flex flex-none rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/85"
        >
          + New listing
        </Link>
      </div>

      {newListingSubmissions.length > 0 && (
        <section>
          <h2 className="font-serif-editorial text-lg text-ink">Awaiting review</h2>
          <div className="mt-3 border-t border-ink/10">
            {newListingSubmissions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 border-b border-ink/10 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {typeof s.payload.title === "string" ? s.payload.title : "New listing"}
                  </p>
                  <p className="mt-0.5 text-xs text-ember">
                    {s.status === "pending" ? "Submitted — waiting on the Wano team." : s.status}
                  </p>
                </div>
                {s.status === "pending" && <WithdrawSubmissionButton submissionId={s.id} kind="listing" />}
              </div>
            ))}
          </div>
        </section>
      )}

      {rejected.length > 0 && (
        <section>
          <h2 className="font-serif-editorial text-lg text-ink">Needs changes</h2>
          <div className="mt-3 border-t border-ink/10">
            {rejected.map((s) => (
              <div key={s.id} className="border-b border-ink/10 py-3">
                <p className="text-sm font-medium text-ink">
                  {typeof s.payload.title === "string" ? s.payload.title : "Submission"}
                </p>
                <p className="mt-0.5 text-xs text-red-600">{s.reviewNotes || "Not approved this time."}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        {listingRows.length === 0 ? (
          <p className="border border-ink/10 bg-white p-5 text-sm text-ink/60">
            You don&apos;t have any listings yet.
          </p>
        ) : (
          <div className="border-t border-ink/10">
            {listingRows.map(({ listing, offer }) => {
              const pending = pendingByListing.get(listing.id);
              return (
                <div key={listing.id} className="border-b border-ink/10 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-serif-editorial text-lg text-ink">{listing.title}</p>
                      <p className="eyebrow mt-1 text-ink/40">{listingTypeLabels[listing.type]}</p>
                      <p className="mt-1 text-sm text-ink/60 line-clamp-2">{listing.description}</p>
                      <p className="font-mono-data mt-1 text-sm font-medium text-ember">
                        {formatListingPrice(listing)}
                      </p>
                      {offer && <p className="mt-1 text-xs text-ember">{offer.discountText}</p>}
                    </div>
                    <div className="flex flex-none flex-col items-end gap-2">
                      <ListingActiveToggle listingId={listing.id} active={listing.active} />
                      <Link
                        href={`/vendor/dashboard/listings/${listing.id}`}
                        className="text-sm font-medium text-ember hover:underline"
                      >
                        Edit →
                      </Link>
                    </div>
                  </div>
                  {pending && (
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink/10 pt-3 text-xs text-ember">
                      <span>An edit is waiting on Wano team review — this page still shows what&apos;s live.</span>
                      <WithdrawSubmissionButton submissionId={pending.id} kind="listing" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
