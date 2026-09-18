import Link from "next/link";
import { AfconPromoCard } from "@/components/afcon/afcon-promo-card";
import { JourneyArt } from "@/components/journey-art";
import { ListingTypeIcon } from "@/components/listing-type-icon";
import { PartnerCard } from "@/components/partner-card";
import { PartnerSearchForm } from "@/components/partner-search-form";
import { getBirthdayPerksForListings } from "@/lib/data/birthday";
import { AFCON_CLUB_ENABLED } from "@/lib/feature-flags";
import {
  getDistinctListingLocations,
  getJourneyTagsForListings,
  getJourneys,
  searchListings,
} from "@/lib/data/journeys";
import { getListingImageIds } from "@/lib/data/listing-images";
import { getRatingSummaries } from "@/lib/data/reviews";
import {
  getPassportProgress,
  getSavedListingsForTraveller,
  getTravellerProfileByUserId,
} from "@/lib/data/traveller";
import { journeyTheme } from "@/lib/journey-theme";
import { logEvent } from "@/lib/analytics";
import { listingTypeLabels, type ListingType } from "@/lib/listing-type";
import { getSession } from "@/lib/session";

const validTypes: ListingType[] = ["hotel", "restaurant", "experience", "transport", "spa_salon"];

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; location?: string; q?: string }>;
}) {
  const { type, location, q } = await searchParams;
  const session = await getSession();

  if (q) {
    await logEvent("search_performed", {
      userId: session?.userId,
      role: session?.role,
      metadata: { q, type, location },
    });
  }

  let unlockedJourneyIds = new Set<string>();
  let savedIds = new Set<string>();
  if (session?.role === "traveller") {
    const travellerProfile = await getTravellerProfileByUserId(session.userId);
    if (travellerProfile) {
      const { progress } = await getPassportProgress(travellerProfile.id);
      unlockedJourneyIds = new Set(progress.filter((p) => p.earned).map((p) => p.journey.id));
      const saved = await getSavedListingsForTraveller(travellerProfile.id);
      savedIds = new Set(saved.map((s) => s.listing.id));
    }
  }

  const validType = validTypes.includes(type as ListingType) ? (type as ListingType) : undefined;

  const [results, locations, journeyList] = await Promise.all([
    searchListings({ type: validType, location: location || undefined, query: q || undefined }),
    getDistinctListingLocations(),
    getJourneys(),
  ]);

  const journeyTagsByListing = await getJourneyTagsForListings(results.map((r) => r.listing.id));
  const ratings = await getRatingSummaries(results.map((r) => r.listing.id));
  const birthdayPerks = await getBirthdayPerksForListings(results.map((r) => r.listing.id));
  const imagesByListing = await getListingImageIds(results.map((r) => r.listing.id));

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 md:px-6">
      <p className="text-xs font-medium uppercase tracking-wide text-nile-700">Explore Wano</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-forest-900 md:text-4xl">
        Places, experiences and journeys near you.
      </h1>
      <p className="mt-3 max-w-2xl text-forest-800/75">
        Every place here is Wano-verified. Browse by type below, or dive into one of the five
        curated Wano Journeys.
      </p>

      {AFCON_CLUB_ENABLED && (
        <div className="mt-6">
          <AfconPromoCard />
        </div>
      )}

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-xl font-semibold text-forest-900">Wano Journeys</h2>
          <Link href="/journeys" className="text-sm font-semibold text-nile-700">
            View all →
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {journeyList.map((journey) => {
            const theme = journeyTheme(journey.slug);
            return (
              <Link
                key={journey.id}
                href={`/journeys/${journey.slug}`}
                className="group overflow-hidden rounded-2xl border border-forest-900/10 bg-white transition hover:shadow-lg"
              >
                <div className="h-20 overflow-hidden" style={{ backgroundColor: theme.hero }}>
                  <JourneyArt slug={journey.slug} className="h-full w-full opacity-35" />
                </div>
                <div className="p-3">
                  <h3 className="font-display text-sm font-semibold text-forest-900">{journey.name}</h3>
                  <p className="mt-0.5 text-xs text-forest-800/60">{journey.location}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-forest-900">Browse everything</h2>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Link
            href="/explore"
            className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition ${
              !validType
                ? "border-forest-800 bg-forest-800 text-white"
                : "border-forest-900/10 bg-white text-forest-900 hover:border-forest-800/40"
            }`}
          >
            <span className="text-2xl" aria-hidden>
              ✨
            </span>
            <span className="text-sm font-semibold">All places</span>
          </Link>
          {Object.entries(listingTypeLabels).map(([value, label]) => {
            const active = validType === value;
            return (
              <Link
                key={value}
                href={`/explore?type=${value}`}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition ${
                  active
                    ? "border-forest-800 bg-forest-800 text-white"
                    : "border-forest-900/10 bg-white text-forest-900 hover:border-forest-800/40"
                }`}
              >
                <ListingTypeIcon type={value as ListingType} className="h-6 w-6" />
                <span className="text-sm font-semibold">{label}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-4">
          <PartnerSearchForm
            locations={locations}
            filters={{ type: validType, location, q }}
            showTypeFilter={false}
          />

          <p className="mt-4 text-sm text-forest-800/60">
            {results.length} Wano-verified {results.length === 1 ? "place" : "places"} found
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  rating={ratings.get(item.listing.id)}
                  saved={savedIds.has(item.listing.id)}
                  birthdayPerk={birthdayPerks.get(item.listing.id)?.[0]}
                  coverImageId={imagesByListing.get(item.listing.id)?.[0]}
                />
              );
            })}
            {results.length === 0 && (
              <p className="col-span-full rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
                No places match those filters yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
