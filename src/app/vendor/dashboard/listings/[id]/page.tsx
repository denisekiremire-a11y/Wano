import { notFound } from "next/navigation";
import { getJourneys } from "@/lib/data/journeys";
import { getListingImageIdsFor } from "@/lib/data/listing-images";
import { getPendingEditSubmission } from "@/lib/data/submissions";
import { getVendorOwnListingFull, getVendorProfileByUserId } from "@/lib/data/vendor";
import { getSession } from "@/lib/session";
import { VendorPhotoManager } from "@/components/vendor-photo-manager";
import { VendorListingForm } from "../vendor-listing-form";

export default async function EditVendorListingPage({ params }: PageProps<"/vendor/dashboard/listings/[id]">) {
  const { id } = await params;
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const [listingRow, journeys, pendingSubmission, existingImages] = await Promise.all([
    getVendorOwnListingFull(vendorProfile.id, id),
    getJourneys(),
    getPendingEditSubmission(vendorProfile.id, "listing", id),
    getListingImageIdsFor(id),
  ]);
  if (!listingRow) notFound();

  const { listing, offer, journeyTags, hotel, restaurant, experience } = listingRow;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">{listing.title}</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Changes here go to the Wano team for review — the listing keeps showing what&apos;s currently approved
          until then.
        </p>
      </div>

      {pendingSubmission && (
        <div className="rounded-xl border border-marigold-300 bg-marigold-50 p-4 text-sm text-marigold-900">
          You have an edit waiting on review, submitted{" "}
          {new Date(pendingSubmission.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.
          Submitting again below replaces that draft.
        </div>
      )}

      <VendorPhotoManager listingId={listing.id} existingImages={existingImages} />

      <VendorListingForm
        journeys={journeys.map((j) => ({ id: j.id, name: j.name }))}
        vendorSocials={{
          instagramUrl: vendorProfile.instagramUrl,
          facebookUrl: vendorProfile.facebookUrl,
          tiktokUrl: vendorProfile.tiktokUrl,
          websiteUrl: vendorProfile.websiteUrl,
        }}
        existing={{
          listingId: listing.id,
          type: listing.type,
          title: listing.title,
          description: listing.description,
          priceLabel: listing.priceLabel,
          priceMinor: listing.priceMinor,
          currency: listing.currency,
          priceUnit: listing.priceUnit,
          externalBookingUrl: listing.externalBookingUrl,
          latitude: listing.latitude,
          longitude: listing.longitude,
          discountText: offer?.discountText ?? "",
          freebieText: offer?.freebieText ?? "",
          journeyIds: journeyTags.map((j) => j.id),
          hotel,
          restaurant,
          experience,
        }}
      />
    </div>
  );
}
