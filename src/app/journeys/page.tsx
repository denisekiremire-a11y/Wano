import Link from "next/link";
import { ByJourneyView } from "./by-journey-view";
import { ExploreView } from "./explore-view";
import {
  getAllPublicListings,
  getDistinctListingLocations,
  getJourneyTagsForListings,
  searchListings,
} from "@/lib/data/journeys";
import { getListingImageIds } from "@/lib/data/listing-images";
import { getPassportProgress, getTravellerProfileByUserId } from "@/lib/data/traveller";
import type { ListingType } from "@/lib/listing-type";
import { getSession } from "@/lib/session";

export default async function JourneysPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; type?: string; location?: string; q?: string }>;
}) {
  const { view, type, location, q } = await searchParams;
  const session = await getSession();
  const isExplore = view === "all";

  let unlockedJourneyIds = new Set<string>();
  if (session?.role === "traveller") {
    const travellerProfile = await getTravellerProfileByUserId(session.userId);
    if (travellerProfile) {
      const { progress } = await getPassportProgress(travellerProfile.id);
      unlockedJourneyIds = new Set(progress.filter((p) => p.earned).map((p) => p.journey.id));
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <p className="text-xs font-medium uppercase tracking-wide text-nile-700">
        {isExplore ? "All verified places" : "The five Wano Journeys"}
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-forest-900 md:text-4xl">
        {isExplore
          ? "Hotels, restaurants and experiences near you."
          : "Find the trip that matches why you're here."}
      </h1>
      <p className="mt-3 max-w-2xl text-forest-800/75">
        {isExplore
          ? "Search across every Wano-verified place — not just the five Wano Journeys. Still the same trusted, verified-only network."
          : "Every business below is Wano-verified. Expand a journey to see who's on it — sign up and book to unlock that journey's member deals."}
      </p>

      <div className="mt-6 inline-flex rounded-full bg-forest-50 p-1">
        <Link
          href="/journeys"
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            !isExplore ? "bg-forest-800 text-white" : "text-forest-800/70"
          }`}
        >
          By journey
        </Link>
        <Link
          href="/journeys?view=all"
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            isExplore ? "bg-forest-800 text-white" : "text-forest-800/70"
          }`}
        >
          All places
        </Link>
      </div>

      <div className="mt-6">
        {isExplore ? (
          <ExploreContent
            session={session}
            unlockedJourneyIds={unlockedJourneyIds}
            type={type}
            location={location}
            q={q}
          />
        ) : (
          <ByJourneyContent session={session} unlockedJourneyIds={unlockedJourneyIds} />
        )}
      </div>
    </main>
  );
}

async function ByJourneyContent({
  session,
  unlockedJourneyIds,
}: {
  session: Awaited<ReturnType<typeof getSession>>;
  unlockedJourneyIds: Set<string>;
}) {
  const journeysWithPartners = await getAllPublicListings();
  return (
    <ByJourneyView
      journeysWithPartners={journeysWithPartners}
      unlockedJourneyIds={unlockedJourneyIds}
      session={session}
    />
  );
}

async function ExploreContent({
  session,
  unlockedJourneyIds,
  type,
  location,
  q,
}: {
  session: Awaited<ReturnType<typeof getSession>>;
  unlockedJourneyIds: Set<string>;
  type?: string;
  location?: string;
  q?: string;
}) {
  const validType = (
    ["hotel", "restaurant", "experience", "transport", "spa_salon"] as const
  ).includes(type as ListingType)
    ? (type as ListingType)
    : undefined;

  const [results, locations] = await Promise.all([
    searchListings({ type: validType, location: location || undefined, query: q || undefined }),
    getDistinctListingLocations(),
  ]);

  const journeyTagsByListing = await getJourneyTagsForListings(results.map((r) => r.listing.id));
  const imagesByListing = await getListingImageIds(results.map((r) => r.listing.id));

  return (
    <ExploreView
      results={results}
      journeyTagsByListing={journeyTagsByListing}
      imagesByListing={imagesByListing}
      locations={locations}
      unlockedJourneyIds={unlockedJourneyIds}
      session={session}
      filters={{ type: validType, location, q }}
    />
  );
}
