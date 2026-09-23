import Link from "next/link";
import { ListingTypeIcon } from "@/components/listing-type-icon";
import type { ListingItem } from "@/lib/data/listing-items";
import { formatMinor } from "@/lib/currency";
import { listingTypeGradient, type ListingType } from "@/lib/listing-type";

/** An image-led card for one selectable thing under a listing — a menu
 * dish, a salon service, a room type, a vehicle, a package tier, a ticket
 * tier. Falls back to the same gradient+icon treatment PartnerCard uses
 * when a listing itself has no photo, until a vendor uploads a real one. */
export function ListingItemCard({
  item,
  listingType,
  coverImageId,
  href,
  active = false,
}: {
  item: ListingItem;
  listingType: ListingType;
  coverImageId?: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`block overflow-hidden rounded-2xl border bg-white transition ${
        active ? "border-nile-600" : "border-forest-900/10 hover:border-forest-900/25"
      }`}
    >
      {coverImageId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/listing-item-images/${coverImageId}`}
          alt={item.name}
          className="h-32 w-full object-cover"
        />
      ) : (
        <div
          className={`flex h-32 items-center justify-center bg-gradient-to-br ${listingTypeGradient[listingType]}`}
        >
          <ListingTypeIcon type={listingType} className="h-8 w-8 text-white/70" />
        </div>
      )}
      <div className="p-3">
        <p className="font-display text-base font-semibold text-forest-900">{item.name}</p>
        {item.description && (
          <p className="mt-0.5 line-clamp-2 text-sm text-forest-800/60">{item.description}</p>
        )}
        {(item.durationText || item.capacityText) && (
          <p className="mt-1 text-[11px] font-medium text-forest-800/50">
            {[item.durationText, item.capacityText].filter(Boolean).join(" · ")}
          </p>
        )}
        {item.priceMinor != null && (
          <p className="mt-1.5 text-sm font-semibold text-ember">
            {formatMinor(item.priceMinor)}
            {item.priceUnit ?? ""}
          </p>
        )}
      </div>
    </Link>
  );
}
