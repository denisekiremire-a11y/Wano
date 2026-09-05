import Link from "next/link";
import { ListingTypeIcon } from "@/components/listing-type-icon";
import { OfferTeaser } from "@/components/offer-teaser";
import { RatingBadge } from "@/components/rating-badge";
import { SaveButton } from "@/components/save-button";
import { VerifiedBadge } from "@/components/verified-badge";
import type { BirthdayPerk } from "@/lib/data/birthday";
import type { searchListings } from "@/lib/data/journeys";
import type { RatingSummary } from "@/lib/data/reviews";
import { formatListingPrice } from "@/lib/currency";
import { listingTypeGradient, listingTypeLabels, type ListingType } from "@/lib/listing-type";
import type { SessionPayload } from "@/lib/session";

type Journey = { id: string; slug: string; name: string };
type PartnerResult = Awaited<ReturnType<typeof searchListings>>[number];

export function PartnerCard({
  item,
  tags,
  unlocked,
  session,
  rating,
  saved,
  birthdayPerk,
  coverImageId,
}: {
  item: PartnerResult;
  tags: Journey[];
  unlocked: boolean;
  session: SessionPayload | null;
  rating?: RatingSummary;
  saved?: boolean;
  birthdayPerk?: BirthdayPerk;
  coverImageId?: string;
}) {
  const { listing, offer, vendor, promo } = item;
  const type = listing.type as ListingType;

  return (
    <div className="overflow-hidden rounded-2xl border border-forest-900/10 bg-white">
      {coverImageId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/listing-images/${coverImageId}`}
          alt={listing.title}
          className="h-32 w-full object-cover"
        />
      ) : (
        <div
          className={`flex h-16 items-center justify-center bg-gradient-to-br ${listingTypeGradient[type]}`}
        >
          <ListingTypeIcon type={type} className="h-7 w-7 text-white/70" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex rounded-full bg-forest-50 px-2 py-0.5 text-[11px] font-medium text-forest-700">
              {listingTypeLabels[type]}
            </span>
            <VerifiedBadge status={vendor.accreditationStatus} />
          </div>
          {session?.role === "traveller" && (
            <SaveButton listingId={listing.id} initialSaved={saved ?? false} />
          )}
        </div>
        <Link
          href={`/explore/${listing.id}`}
          className="mt-1.5 block font-display text-lg font-semibold text-forest-900 hover:underline"
        >
          {listing.title}
        </Link>
        <p className="text-sm text-forest-800/70">{vendor.businessName}</p>
        <p className="text-xs text-forest-800/50">{vendor.location}</p>
        {rating && (
          <div className="mt-1">
            <RatingBadge average={rating.average} count={rating.count} />
          </div>
        )}

        <p className="mt-2 text-sm text-forest-800/60">{listing.description}</p>
        <p className="mt-2 text-sm font-medium text-nile-700">{formatListingPrice(listing)}</p>

        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t.id}
                className="rounded-full bg-marigold-50 px-2 py-0.5 text-[11px] font-medium text-marigold-800"
              >
                {t.name}
              </span>
            ))}
          </div>
        )}

        {offer && (
          <div className="mt-3">
            <OfferTeaser
              discountText={offer.discountText}
              freebieText={offer.freebieText}
              unlocked={unlocked}
              unlockHint={session ? "Book to unlock" : "Sign up to unlock"}
              unlockHref={session ? (tags[0] ? `/journeys/${tags[0].slug}` : "#") : "/signup"}
            />
          </div>
        )}

        {birthdayPerk && (
          <div className="mt-2 rounded-lg bg-marigold-50 px-3 py-2 text-sm text-marigold-900">
            <p className="font-medium">🎂 {birthdayPerk.title}</p>
            <p className="text-marigold-800/80">
              For a table of {birthdayPerk.minPartySize}+ on your birthday:{" "}
              {[birthdayPerk.discountText, birthdayPerk.freebieText].filter(Boolean).join(" + ")}
            </p>
          </div>
        )}

        {promo && (
          <div className="mt-2">
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-marigold-700">
              Place promo
            </p>
            <OfferTeaser
              discountText={`${promo.code} — ${promo.discountText}`}
              freebieText={promo.freebieText}
              unlocked={unlocked}
              unlockHint={session ? "Book to unlock" : "Sign up to unlock"}
              unlockHref={session ? (tags[0] ? `/journeys/${tags[0].slug}` : "#") : "/signup"}
            />
          </div>
        )}

        <div className="mt-3">
          <Link
            href={`/explore/${listing.id}`}
            className="block w-full rounded-full bg-forest-800 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-forest-700"
          >
            View & book →
          </Link>
        </div>
      </div>
    </div>
  );
}
