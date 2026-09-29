import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMinor } from "@/lib/currency";
import { getListingItemImageIds, getListingItems } from "@/lib/data/listing-items";
import { getVendorOwnListingFull, getVendorProfileByUserId } from "@/lib/data/vendor";
import { listingItemSectionLabel } from "@/lib/listing-type";
import { getSession } from "@/lib/session";
import { DeleteItemButton } from "./delete-item-button";
import { VendorItemForm } from "./vendor-item-form";
import { VendorItemPhotoManager } from "./vendor-item-photo-manager";

export default async function VendorListingItemsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const session = await getSession();
  const vendorProfile = await getVendorProfileByUserId(session!.userId);
  if (!vendorProfile) return null;

  const listingRow = await getVendorOwnListingFull(vendorProfile.id, id);
  if (!listingRow) notFound();
  const { listing } = listingRow;

  const items = await getListingItems(listing.id);
  const imageIdsByItem = await getListingItemImageIds(items.map((item) => item.id));

  const sectionLabel = listingItemSectionLabel[listing.type];
  const editingItem = edit ? items.find((item) => item.id === edit) : undefined;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/vendor/dashboard/listings/${listing.id}`}
          className="eyebrow text-ink/40 hover:text-ink"
        >
          ← Back to {listing.title}
        </Link>
        <h1 className="font-serif-editorial mt-3 text-2xl text-ink">Manage {sectionLabel}</h1>
        <p className="mt-1 text-sm text-ink/60">
          These show on your listing page — add, edit, or remove them any time, no review needed.
        </p>
      </div>

      {items.length > 0 && (
        <section className="border-t border-ink/10">
          {items.map((item) => {
            const imageIds = imageIdsByItem.get(item.id) ?? [];
            const priceText =
              item.priceMinor != null ? `${formatMinor(item.priceMinor, listing.currency)}${item.priceUnit ?? ""}` : null;

            return (
              <div key={item.id} className="flex items-start gap-4 border-b border-ink/10 py-4">
                {imageIds[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/listing-item-images/${imageIds[0]}`}
                    alt=""
                    className="h-16 w-16 flex-none border border-ink/10 object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 flex-none bg-ink/5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">{item.name}</p>
                    {item.sectionLabel && <span className="eyebrow text-ink/40">{item.sectionLabel}</span>}
                  </div>
                  {item.description && (
                    <p className="mt-0.5 text-sm text-ink/60 line-clamp-2">{item.description}</p>
                  )}
                  <p className="font-mono-data mt-1 text-sm font-medium text-ember">{priceText ?? "No price set"}</p>
                </div>
                <div className="flex flex-none flex-col items-end gap-2">
                  <Link
                    href={`/vendor/dashboard/listings/${listing.id}/items?edit=${item.id}`}
                    className="text-sm font-medium text-ember hover:underline"
                  >
                    Edit
                  </Link>
                  <DeleteItemButton itemId={item.id} />
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">
          {editingItem ? `Edit ${editingItem.name}` : `Add to ${sectionLabel}`}
        </h2>
        <VendorItemForm key={editingItem?.id ?? "new"} listingId={listing.id} existing={editingItem} />
        {editingItem && (
          <div className="mt-4 border-t border-ink/10 pt-4">
            <VendorItemPhotoManager itemId={editingItem.id} existingImages={imageIdsByItem.get(editingItem.id) ?? []} />
          </div>
        )}
      </section>
    </div>
  );
}
