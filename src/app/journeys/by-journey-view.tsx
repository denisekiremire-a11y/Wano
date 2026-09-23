import Image from "next/image";
import Link from "next/link";
import { AnchorSortedList, type AnchorSortableItem } from "@/components/afcon/anchor-sorted-list";
import { DistanceBadge } from "@/components/afcon/distance-badge";
import { OfferTeaser } from "@/components/offer-teaser";
import type { Coordinates } from "@/lib/afcon/anchors";
import { formatListingPrice } from "@/lib/currency";
import type { getAllPublicListings } from "@/lib/data/journeys";
import { journeyTheme } from "@/lib/journey-theme";
import type { SessionPayload } from "@/lib/session";

type JourneysWithPartners = Awaited<ReturnType<typeof getAllPublicListings>>;

function partnerCoordinates(partner: { listing: { latitude: string | null; longitude: string | null } }): Coordinates | null {
  const lat = partner.listing.latitude != null ? Number(partner.listing.latitude) : NaN;
  const lng = partner.listing.longitude != null ? Number(partner.listing.longitude) : NaN;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null;
}

export function ByJourneyView({
  journeysWithPartners,
  unlockedJourneyIds,
  session,
}: {
  journeysWithPartners: JourneysWithPartners;
  unlockedJourneyIds: Set<string>;
  session: SessionPayload | null;
}) {
  return (
    <AnchorSortedList
      className="space-y-4"
      items={journeysWithPartners.map(({ journey, partners }): AnchorSortableItem => {
        const theme = journeyTheme(journey.slug);
        const unlocked = unlockedJourneyIds.has(journey.id);
        return {
          id: journey.id,
          coordinates: partners.map(partnerCoordinates).filter((c): c is Coordinates => c !== null),
          node: (
          <details
            className="group overflow-hidden rounded-2xl border border-forest-900/10 bg-white open:shadow-md"
          >
            <summary className="flex cursor-pointer list-none flex-col">
              <span
                className="relative h-48 w-full overflow-hidden sm:h-56"
                style={{ backgroundColor: theme.hero }}
                aria-hidden
              >
                {theme.image && (
                  <Image
                    src={theme.image}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 700px, 100vw"
                    className="object-cover"
                  />
                )}
                <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-forest-800 transition group-open:rotate-180">
                  ▾
                </span>
              </span>
              <div className="flex items-start justify-between gap-4 p-5">
                <div>
                  <h2 className="font-display text-lg font-semibold text-forest-900">
                    <Link href={`/journeys/${journey.slug}`} className="hover:underline">
                      {journey.name}
                    </Link>
                  </h2>
                  <p className="text-sm text-forest-800/65">
                    {journey.location} · {partners.length} verified business
                    {partners.length === 1 ? "" : "es"}
                  </p>
                </div>
              </div>
            </summary>

            <div className="border-t border-forest-900/10 p-5 pt-4">
              <p className="text-sm text-forest-800/70">{journey.description}</p>
              <div className="mt-4 space-y-3">
                {partners.length === 0 && (
                  <p className="text-sm text-forest-800/50">
                    Businesses for this journey are being onboarded — check back soon.
                  </p>
                )}
                {partners.map(({ listing, offer, vendor, promo }) => (
                  <div
                    key={listing.id}
                    className="rounded-xl border border-forest-900/10 p-4 sm:flex sm:items-start sm:justify-between sm:gap-4"
                  >
                    <div>
                      <p className="font-medium text-forest-900">{listing.title}</p>
                      {vendor.location && <p className="text-sm text-forest-800/70">{vendor.location}</p>}
                      <p className="mt-1 text-xs text-forest-800/50">{formatListingPrice(listing)}</p>
                      <div className="mt-1">
                        <DistanceBadge id={listing.id} latitude={listing.latitude} longitude={listing.longitude} />
                      </div>
                    </div>
                    <div className="mt-3 space-y-2 sm:mt-0 sm:w-56">
                      {offer && (
                        <OfferTeaser
                          discountText={offer.discountText}
                          freebieText={offer.freebieText}
                          unlocked={unlocked}
                          unlockHint={session ? "Book to unlock" : "Sign up to unlock"}
                          unlockHref={session ? `/journeys/${journey.slug}` : "/signup"}
                        />
                      )}
                      {promo && (
                        <OfferTeaser
                          discountText={`${promo.code} — ${promo.discountText}`}
                          freebieText={promo.freebieText}
                          unlocked={unlocked}
                          unlockHint={session ? "Book to unlock" : "Sign up to unlock"}
                          unlockHref={session ? `/journeys/${journey.slug}` : "/signup"}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>
          ),
        };
      })}
    />
  );
}
