import Image from "next/image";
import Link from "next/link";
import { AfconPromoCard } from "@/components/afcon/afcon-promo-card";
import { JourneyArt } from "@/components/journey-art";
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

  const viewTabs = [
    { key: "all" as const, label: "All" },
    { key: "places" as const, label: "Places" },
    { key: "trending" as const, label: "Trending" },
  ];

  return (
    <main className="font-editorial-body bg-paper">
      {/* Header — a functional filter bar, so it keeps a real hero's
          asymmetry (heavy serif left, controls staggered right at the
          baseline) without pretending to be marketing copy: the tabs and
          verified toggle are underline-on-active text, never pill
          buttons. */}
      <section className="border-b border-ink/10">
        <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="eyebrow text-ember">Explore Wano</p>
              <h1 className="font-serif-editorial mt-3 text-4xl leading-[0.98] text-ink md:text-5xl">
                Places, experiences and journeys near you.
              </h1>
              <p className="mt-4 max-w-md text-ink/60">
                Every place here is Wano-verified. Browse by type below, or dive into one of the
                five curated Wano Journeys.
              </p>
            </div>

            <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:col-span-5 lg:justify-end">
              {viewTabs.map((v) => (
                <Link
                  key={v.key}
                  href={buildHref({ view: v.key })}
                  className={`eyebrow border-b-2 pb-1 transition-colors ${
                    activeView === v.key
                      ? "border-ember text-ink"
                      : "border-transparent text-ink/40 hover:text-ink"
                  }`}
                >
                  {v.label}
                </Link>
              ))}
              <span className="hidden h-3.5 w-px bg-ink/15 sm:block" />
              <Link
                href={buildHref({ verified: !verifiedOnly })}
                className={`eyebrow border-b-2 pb-1 transition-colors ${
                  verifiedOnly ? "border-ember text-ink" : "border-transparent text-ink/40 hover:text-ink"
                }`}
              >
                Verified · deals
              </Link>
            </nav>
          </div>

          {AFCON_CLUB_ENABLED && (
            <div className="mt-10">
              <AfconPromoCard />
            </div>
          )}
        </div>
      </section>

      {activeView === "all" && (
        <section className="border-b border-ink/10">
          <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
            <p className="eyebrow text-ember">Five itineraries</p>
            <h2 className="font-serif-editorial mt-2 text-2xl text-ink md:text-3xl">Curated journeys</h2>
            <div className="mt-6 flex gap-5 overflow-x-auto pb-1">
              {journeyList.map((journey) => {
                const theme = journeyTheme(journey.slug);
                return (
                  <Link
                    key={journey.id}
                    href={`/journeys/${journey.slug}`}
                    className="group w-44 flex-none"
                  >
                    <div
                      className="relative aspect-[4/3] overflow-hidden border border-ink/10"
                      style={{ backgroundColor: theme.hero }}
                    >
                      {theme.image ? (
                        <Image
                          src={theme.image}
                          alt=""
                          fill
                          sizes="176px"
                          unoptimized
                          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                        />
                      ) : (
                        <JourneyArt slug={journey.slug} className="h-full w-full opacity-35" />
                      )}
                    </div>
                    <h3 className="font-serif-editorial mt-3 text-lg text-ink transition-colors group-hover:text-ember">
                      {journey.name}
                    </h3>
                    <p className="eyebrow mt-1 text-ink/40">{journey.location}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="border-b border-ink/10">
        <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
          <p className="eyebrow text-ember">By type</p>
          <h2 className="font-serif-editorial mt-2 text-2xl text-ink md:text-3xl">Browse everything</h2>

          {/* A typography table, not a row of icon tiles — active state
              reads as ink-on-white with an underline, not a filled box. */}
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t border-ink/10 pt-6">
            <Link
              href={buildHref({ type: undefined })}
              className={`text-lg transition-colors ${
                !validType ? "border-b-2 border-ember text-ink" : "border-b-2 border-transparent text-ink/40 hover:text-ink"
              }`}
            >
              All places
            </Link>
            {Object.entries(listingTypeLabels).map(([value, label]) => {
              const active = validType === value;
              return (
                <Link
                  key={value}
                  href={buildHref({ type: value })}
                  className={`text-lg transition-colors ${
                    active ? "border-b-2 border-ember text-ink" : "border-b-2 border-transparent text-ink/40 hover:text-ink"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          <div className="mt-8">
            <PartnerSearchForm
              locations={locations}
              filters={{ type: validType, location, q }}
              showTypeFilter={false}
            />
          </div>

          {/* Results — a dense, evenly-spaced grid on purpose: it's the
              one part of this page that's an actual search-results list
              rather than curated editorial content, so a tight, scannable
              layout is the honest choice against the generous whitespace
              above, not a shortcut. */}
          <p className="eyebrow mt-8 text-ink/40">
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
              <p className="col-span-full border border-ink/10 bg-white p-6 text-center text-sm text-ink/50">
                No places match those filters yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
