import { PartnerCard } from "@/components/partner-card";
import { PartnerSearchForm } from "@/components/partner-search-form";
import { getBirthdayPerksForListings } from "@/lib/data/birthday";
import {
  getDistinctListingLocations,
  getJourneyTagsForListings,
  searchListings,
} from "@/lib/data/journeys";
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
  let hasBirthdaySet = false;
  if (session?.role === "traveller") {
    const travellerProfile = await getTravellerProfileByUserId(session.userId);
    if (travellerProfile) {
      const { progress } = await getPassportProgress(travellerProfile.id);
      unlockedJourneyIds = new Set(progress.filter((p) => p.earned).map((p) => p.journey.id));
      hasBirthdaySet = travellerProfile.dateOfBirth != null;
    }
  }

  const validType = validTypes.includes(type as ListingType) ? (type as ListingType) : undefined;

  const [results, locations] = await Promise.all([
    searchListings({ type: validType, location: location || undefined, query: q || undefined }),
    getDistinctListingLocations(),
  ]);

  const journeyTagsByListing = await getJourneyTagsForListings(results.map((r) => r.listing.id));
  const birthdayPerks = await getBirthdayPerksForListings(results.map((r) => r.listing.id));

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <p className="text-xs font-medium uppercase tracking-wide text-nile-700">Wano Places</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-forest-900 md:text-4xl">
        Every verified place, all in one spot.
      </h1>
      <p className="mt-3 max-w-2xl text-forest-800/75">
        Museums, parks, game hubs and play areas · hotels, spas and salons · restaurants and
        transport. Every place listed here has gone through Wano&apos;s verification process —
        the same trust as the five Wano Journeys, just browsable directly by what you&apos;re in
        the mood for.
      </p>

      <div className="mt-6">
        <PartnerSearchForm locations={locations} filters={{ type: validType, location, q }} />

        <p className="mt-4 text-sm text-forest-800/60">
          {results.length} verified {results.length === 1 ? "place" : "places"} found
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
                hasBirthdaySet={hasBirthdaySet}
              />
            );
          })}
          {results.length === 0 && (
            <p className="col-span-2 rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
              No places match those filters yet.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
