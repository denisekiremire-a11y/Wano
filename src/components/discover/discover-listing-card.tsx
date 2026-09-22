import Link from "next/link";
import { ListingTypeIcon } from "@/components/listing-type-icon";
import { SaveButton } from "@/components/save-button";
import { VerifiedBadge } from "@/components/verified-badge";
import { formatListingPrice } from "@/lib/currency";
import { listingTypeGradient, listingTypeLabels, type ListingType } from "@/lib/listing-type";
import type { TrendingListing } from "@/lib/data/discover";

export function DiscoverListingCard({
  item,
  coverImageId,
  saved,
  canSave,
}: {
  item: TrendingListing;
  coverImageId?: string;
  saved?: boolean;
  canSave: boolean;
}) {
  const { listing, vendor } = item;
  const type = listing.type as ListingType;
  const price = formatListingPrice(listing);

  return (
    <div className="overflow-hidden rounded-2xl border border-forest-900/10 bg-white">
      <Link href={`/explore/${listing.id}`} className="block">
        {coverImageId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/listing-images/${coverImageId}`}
            alt=""
            className="h-32 w-full object-cover"
          />
        ) : (
          <div className={`flex h-32 items-center justify-center bg-gradient-to-br ${listingTypeGradient[type]}`}>
            <ListingTypeIcon type={type} className="h-8 w-8 text-white/70" />
          </div>
        )}
      </Link>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-forest-50 px-2 py-0.5 text-[11px] font-medium text-forest-700">
            <ListingTypeIcon type={type} className="h-3 w-3" />
            {listingTypeLabels[type]}
          </span>
          {canSave && <SaveButton listingId={listing.id} initialSaved={saved ?? false} />}
        </div>
        <Link href={`/explore/${listing.id}`} className="mt-1 block truncate font-medium text-forest-900 hover:underline">
          {listing.title}
        </Link>
        <p className="truncate text-xs text-forest-800/50">{vendor.location}</p>
        {price && <p className="mt-1 text-sm font-semibold text-ember">{price}</p>}
        <VerifiedBadge status={vendor.accreditationStatus} className="mt-1.5" />
      </div>
    </div>
  );
}
