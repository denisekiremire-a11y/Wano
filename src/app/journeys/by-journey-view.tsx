import Link from "next/link";
import { JourneyArt } from "@/components/journey-art";
import { OfferTeaser } from "@/components/offer-teaser";
import type { getAllPublicListings } from "@/lib/data/journeys";
import { journeyTheme } from "@/lib/journey-theme";
import type { SessionPayload } from "@/lib/session";

type JourneysWithPartners = Awaited<ReturnType<typeof getAllPublicListings>>;

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
    <div className="space-y-4">
      {journeysWithPartners.map(({ journey, partners }) => {
        const theme = journeyTheme(journey.slug);
        const unlocked = unlockedJourneyIds.has(journey.id);
        return (
          <details
            key={journey.id}
            className="group overflow-hidden rounded-2xl border border-forest-900/10 bg-white open:shadow-md"
          >
            <summary className="flex cursor-pointer list-none items-center gap-4 p-5">
              <span className={`h-12 w-12 flex-none overflow-hidden rounded-xl bg-gradient-to-br ${theme.gradient}`}>
                <JourneyArt slug={journey.slug} className="h-full w-full" />
              </span>
              <div className="flex-1">
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
              <span className="text-forest-800/50 transition group-open:rotate-180">▾</span>
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
                      <p className="text-sm text-forest-800/70">{vendor.businessName}</p>
                      <p className="mt-1 text-xs text-forest-800/50">{listing.priceHint}</p>
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
        );
      })}
    </div>
  );
}
