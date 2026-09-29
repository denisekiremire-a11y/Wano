import { PartnerCard } from "@/components/partner-card";
import { PartnerSearchForm } from "@/components/partner-search-form";
import { getBirthdayPerksForListings } from "@/lib/data/birthday";
import {
  getDistinctListingLocations,
  getJourneyTagsForListings,
  searchListings,
} from "@/lib/data/journeys";
import { getListingImageIds } from "@/lib/data/listing-images";
import { getPassportProgress, getTravellerProfileByUserId } from "@/lib/data/traveller";
import type { ListingType } from "@/lib/listing-type";
import { getSession } from "@/lib/session";

const validTypes: ListingType[] = ["hotel", "restaurant", "experience", "transport", "spa_salon"];

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; location?: string; q?: string }>;
}) {
  const { type, location, q } = await searchParams;
  const session = await getSession();

  let unlockedJourneyIds = new Set<string>();
  if (session?.role === "traveller") {
    const travellerProfile = await getTravellerProfileByUserId(session.userId);
    if (travellerProfile) {
      const { progress } = await getPassportProgress(travellerProfile.id);
      unlockedJourneyIds = new Set(progress.filter((p) => p.earned).map((p) => p.journey.id));
    }
  }

  const validType = validTypes.includes(type as ListingType) ? (type as ListingType) : undefined;

  const [results, locations] = await Promise.all([
    searchListings({ type: validType, location: location || undefined, query: q || undefined }),
    getDistinctListingLocations(),
  ]);

  const journeyTagsByListing = await getJourneyTagsForListings(results.map((r) => r.listing.id));
  const birthdayPerks = await getBirthdayPerksForListings(results.map((r) => r.listing.id));
  const imagesByListing = await getListingImageIds(results.map((r) => r.listing.id));

  return (
    <main className="font-editorial-body bg-paper">
      <section className="border-b border-ink/10">
        <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
          <p className="eyebrow text-ember">Wano Places</p>
          <h1 className="font-serif-editorial mt-3 text-4xl leading-[0.98] text-ink md:text-5xl">
            Every verified place, all in one spot.
          </h1>
          <p className="mt-4 max-w-2xl text-ink/60">
            Museums, parks, game hubs and play areas · hotels, spas and salons · restaurants and
            transport. Every place listed here has gone through Wano&apos;s verification process —
            the same trust as the five Wano Journeys, just browsable directly by what you&apos;re in
            the mood for.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <PartnerSearchForm locations={locations} filters={{ type: validType, location, q }} />

        <p className="mt-6 flex items-center gap-2 text-ink/40">
          <span className="live-dot text-ember" />
          <span className="font-mono-data text-[11px] uppercase tracking-[0.2em]">
            {results.length} Wano-verified {results.length === 1 ? "place" : "places"} found
          </span>
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {results.map((item) => {
            const tags = journeyTagsByListing.get(item.listing.id) ?? [];
            const unlocked =
              session != null &&
              (tags.length === 0 || tags.some((t) => unlockedJourneyIds.has(t.id)));
            return (
              <PartnerCard
                key={item.listing.id}
                item={item}
                tags={tags}
                unlocked={unlocked}
                session={session}
                birthdayPerk={birthdayPerks.get(item.listing.id)?.[0]}
                coverImageId={imagesByListing.get(item.listing.id)?.[0]}
              />
            );
          })}
          {results.length === 0 && (
            <p className="col-span-2 border border-ink/10 bg-white p-6 text-center text-sm text-ink/50">
              No places match those filters yet.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
