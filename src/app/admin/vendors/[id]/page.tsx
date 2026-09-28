import { notFound } from "next/navigation";
import Link from "next/link";
import { getVendorDetail } from "@/lib/data/admin";
import { getListingImageIdsFor } from "@/lib/data/listing-images";
import { requireAdminPage } from "@/lib/auth";
import { withRlsContext } from "@/lib/db-context";
import { AccreditationPanel } from "./accreditation-panel";
import { DocumentReviewRow } from "./document-review-row";
import { ListingForm } from "./listing-form";

export default async function AdminVendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminPage("/admin/vendors");
  const { id } = await params;
  const detail = await withRlsContext({ userId: session.userId, role: "admin" }, (tx) => getVendorDetail(id, tx));
  if (!detail) notFound();

  const { vendorProfile, vendorUser, listingRow, documents, reviews, allJourneys } = detail;
  const existingImages = listingRow ? await getListingImageIdsFor(listingRow.listing.id) : [];

  return (
    <div className="space-y-6">
      <Link href="/admin/vendors" className="eyebrow text-ink/40 hover:text-ink">
        ← All vendors
      </Link>

      <div>
        <h1 className="font-serif-editorial text-2xl text-ink md:text-3xl">
          {vendorProfile.businessName}
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          {vendorUser.email} · {vendorProfile.location}
        </p>
        <p className="mt-2 max-w-2xl text-sm text-ink/70">{vendorProfile.description}</p>
      </div>

      <AccreditationPanel vendorProfileId={vendorProfile.id} status={vendorProfile.accreditationStatus} />

      <section className="space-y-3 border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">KYC documents</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-ink/60">No documents submitted yet.</p>
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
        existingImages={existingImages}
        vendorSocials={{
          instagramUrl: vendorProfile.instagramUrl,
          facebookUrl: vendorProfile.facebookUrl,
          tiktokUrl: vendorProfile.tiktokUrl,
          websiteUrl: vendorProfile.websiteUrl,
        }}
        existing={
          listingRow
            ? {
                listingId: listingRow.listing.id,
                type: listingRow.listing.type,
                title: listingRow.listing.title,
                description: listingRow.listing.description,
                priceLabel: listingRow.listing.priceLabel,
                priceMinor: listingRow.listing.priceMinor,
                currency: listingRow.listing.currency,
                priceUnit: listingRow.listing.priceUnit,
                isPublished: listingRow.listing.isPublished,
                externalBookingUrl: listingRow.listing.externalBookingUrl,
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
        <section className="space-y-2 border border-ink/10 bg-white p-5">
          <h2 className="font-serif-editorial text-lg text-ink">Review history</h2>
          {reviews.map(({ review, reviewer }) => (
            <div key={review.id} className="border-b border-ink/10 pb-2 text-sm last:border-0">
              <p className="font-medium text-ink">
                {review.decision} <span className="font-normal text-ink/60">by {reviewer.name}</span>
              </p>
              {review.notes && <p className="text-ink/70">{review.notes}</p>}
              <p className="font-mono-data text-xs text-ink/40">
                {new Date(review.decidedAt).toLocaleString()}
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
