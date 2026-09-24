import Image from "next/image";
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

const validTypes = Object.keys(listingTypeLabels) as ListingType[];
const validViews = ["all", "places", "trending"] as const;
type ExploreView = (typeof validViews)[number];

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; location?: string; q?: string; view?: string; verified?: string }>;
}) {
  const { type, location, q, view, verified } = await searchParams;
  const session = await getSession();
  const activeView: ExploreView = validViews.includes(view as ExploreView) ? (view as ExploreView) : "all";
  const verifiedOnly = verified === "1";

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

  const [rawResults, locations, journeyList] = await Promise.all([
    searchListings({ type: validType, location: location || undefined, query: q || undefined }),
    getDistinctListingLocations(),
    getJourneys(),
  ]);

  // "Wano Verified" toggle: has a live discount/freebie — the same
  // predicate /verified used to filter on (it was never a trust toggle;
  // searchListings() already only ever returns trusted-vendor listings).
  const dealFiltered = verifiedOnly
    ? rawResults.filter((r) => r.offer && (r.offer.discountText || r.offer.freebieText))
    : rawResults;
  // "Trending": sorted by view count rather than a separate data source,
  // so it stays the exact same result shape (with offer/promo joined)
  // PartnerCard already expects.
  const results =
    activeView === "trending"
      ? [...dealFiltered].sort((a, b) => b.listing.viewCount - a.listing.viewCount)
      : dealFiltered;

  const journeyTagsByListing = await getJourneyTagsForListings(results.map((r) => r.listing.id));
  const ratings = await getRatingSummaries(results.map((r) => r.listing.id));
  const birthdayPerks = await getBirthdayPerksForListings(results.map((r) => r.listing.id));
  const imagesByListing = await getListingImageIds(results.map((r) => r.listing.id));

  // Builds an /explore URL carrying every current filter forward except
  // whatever this link means to change — so switching, say, the type tile
  // doesn't silently reset the view/verified chips, and vice versa.
  function buildHref(overrides: { type?: string; view?: ExploreView; verified?: boolean }) {
    const params = new URLSearchParams();
    const nextType = "type" in overrides ? overrides.type : validType;
    const nextView = "view" in overrides ? overrides.view : activeView;
    const nextVerified = "verified" in overrides ? overrides.verified : verifiedOnly;
    if (nextType) params.set("type", nextType);
    if (location) params.set("location", location);
    if (q) params.set("q", q);
    if (nextView && nextView !== "all") params.set("view", nextView);
    if (nextVerified) params.set("verified", "1");
    const qs = params.toString();
    return qs ? `/explore?${qs}` : "/explore";
  }

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

      <div className="mt-6 flex flex-wrap gap-1.5">
        {(
          [
            { key: "all" as const, label: "All" },
            { key: "places" as const, label: "Places" },
            { key: "trending" as const, label: "Trending" },
          ]
        ).map((v) => (
          <Link
            key={v.key}
            href={buildHref({ view: v.key })}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              activeView === v.key
                ? "border-forest-800 bg-forest-800 text-white"
                : "border-forest-900/15 text-forest-800 hover:bg-forest-50"
            }`}
          >
            {v.label}
          </Link>
        ))}
        <Link
          href={buildHref({ verified: !verifiedOnly })}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
            verifiedOnly
              ? "border-forest-800 bg-forest-800 text-white"
              : "border-forest-900/15 text-forest-800 hover:bg-forest-50"
          }`}
        >
          Wano Verified · deals
        </Link>
      </div>

      {activeView === "all" && (
        <section className="mt-8 min-w-0">
          <h2 className="font-display text-xl font-semibold text-forest-900">Curated journeys</h2>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-1">
          {journeyList.map((journey) => {
            const theme = journeyTheme(journey.slug);
            return (
              <Link
                key={journey.id}
                href={`/journeys/${journey.slug}`}
                className="group w-40 flex-none overflow-hidden rounded-2xl border border-forest-900/10 bg-white transition hover:shadow-lg"
              >
                <div className="relative h-20 overflow-hidden" style={{ backgroundColor: theme.hero }}>
                  {theme.image ? (
                    <Image
                      src={theme.image}
                      alt=""
                      fill
                      sizes="160px"
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <JourneyArt slug={journey.slug} className="h-full w-full opacity-35" />
                  )}
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
      )}

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-forest-900">Browse everything</h2>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Link
            href={buildHref({ type: undefined })}
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
                href={buildHref({ type: value })}
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
