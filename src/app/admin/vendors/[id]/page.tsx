import { notFound } from "next/navigation";
import Link from "next/link";
import { getVendorDetail } from "@/lib/data/admin";
import { AccreditationPanel } from "./accreditation-panel";
import { DocumentReviewRow } from "./document-review-row";
import { ListingForm } from "./listing-form";

export default async function AdminVendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getVendorDetail(id);
  if (!detail) notFound();

  const { vendorProfile, vendorUser, listingRow, documents, reviews, allJourneys } = detail;

  return (
    <div className="space-y-6">
      <Link href="/admin/vendors" className="text-sm text-nile-700 hover:underline">
        ← All vendors
      </Link>

      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">
          {vendorProfile.businessName}
        </h1>
        <p className="mt-1 text-sm text-forest-800/60">
          {vendorUser.email} · {vendorProfile.location}
        </p>
        <p className="mt-2 max-w-2xl text-sm text-forest-800/70">{vendorProfile.description}</p>
      </div>

      <AccreditationPanel vendorProfileId={vendorProfile.id} status={vendorProfile.accreditationStatus} />

      <section className="space-y-3 rounded-2xl border border-forest-900/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-forest-900">KYC documents</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-forest-800/60">No documents submitted yet.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <DocumentReviewRow
                key={doc.id}
                documentId={doc.id}
                docType={doc.docType}
                fileName={doc.fileName}
                status={doc.status}
              />
            ))}
          </div>
        )}
      </section>

      <ListingForm
        vendorProfileId={vendorProfile.id}
        journeys={allJourneys.map((j) => ({ id: j.id, name: j.name }))}
        existing={
          listingRow
            ? {
                listingId: listingRow.listing.id,
                type: listingRow.listing.type,
                title: listingRow.listing.title,
                description: listingRow.listing.description,
                priceHint: listingRow.listing.priceHint,
                latitude: listingRow.listing.latitude,
                longitude: listingRow.listing.longitude,
                discountText: listingRow.offer?.discountText ?? "",
                freebieText: listingRow.offer?.freebieText ?? "",
                journeyIds: listingRow.journeyTags.map((j) => j.id),
                hotel: listingRow.hotel,
                restaurant: listingRow.restaurant,
                experience: listingRow.experience,
              }
            : undefined
        }
      />

      {reviews.length > 0 && (
        <section className="space-y-2 rounded-2xl border border-forest-900/10 bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-forest-900">Review history</h2>
          {reviews.map(({ review, reviewer }) => (
            <div key={review.id} className="border-b border-forest-900/5 pb-2 text-sm last:border-0">
              <p className="font-medium text-forest-900">
                {review.decision} <span className="font-normal text-forest-800/60">by {reviewer.name}</span>
              </p>
              {review.notes && <p className="text-forest-800/70">{review.notes}</p>}
              <p className="text-xs text-forest-800/40">
                {new Date(review.decidedAt).toLocaleString()}
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
