import { SearchIcon } from "@/components/icons";
import { DiscoverTabs } from "@/components/discover/discover-tabs";
import { getTrendingJourneys, getTrendingListings } from "@/lib/data/discover";
import { getListingImageIds } from "@/lib/data/listing-images";
import { getPublishedJournalPosts } from "@/lib/data/journal";
import { getSuggestedPeople, isFollowing } from "@/lib/data/social";
import { getSavedListingsForTraveller, getTravellerProfileByUserId } from "@/lib/data/traveller";
import { getSession } from "@/lib/session";

export default async function DiscoverPage() {
  const session = await getSession();
  const viewerProfile = session?.role === "traveller" ? await getTravellerProfileByUserId(session.userId) : null;

  const [listings, trendingJourneys, journalPosts, suggestedPeople] = await Promise.all([
    getTrendingListings(24),
    getTrendingJourneys(6),
    getPublishedJournalPosts(12),
    getSuggestedPeople(viewerProfile?.id ?? "", 12),
  ]);

  const [listingImages, savedRows, followingFlags] = await Promise.all([
    getListingImageIds(listings.map((item) => item.listing.id)),
    viewerProfile ? getSavedListingsForTraveller(viewerProfile.id) : Promise.resolve([]),
    viewerProfile
      ? Promise.all(suggestedPeople.map((p) => isFollowing(viewerProfile.id, p.traveller.id)))
      : Promise.resolve(suggestedPeople.map(() => false)),
  ]);

  const savedListingIds = new Set(savedRows.map((r) => r.listing.id));
  const people = suggestedPeople.map((p, i) => ({ ...p, following: followingFlags[i] }));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <p className="eyebrow text-ember">Discover</p>
      <h1 className="font-editorial mt-2 text-3xl font-bold text-ink md:text-4xl">
        Find what&rsquo;s worth the trip.
      </h1>
      <p className="mt-3 max-w-2xl text-ink/70">
        Trending places, what&rsquo;s nearby, people to follow, and guides written by the Wano team.
      </p>

      <form action="/search" method="GET" className="mt-6">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-800/40" />
          <input
            type="search"
            name="q"
            placeholder="Search destinations, people…"
            className="w-full rounded-full border border-forest-900/15 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-forest-600"
          />
        </div>
      </form>

      <div className="mt-6">
        <DiscoverTabs
          listings={listings}
          listingImages={listingImages}
          savedListingIds={savedListingIds}
          journeys={trendingJourneys}
          people={people}
          journalPosts={journalPosts.map((r) => r.post)}
          mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || null}
          canSaveListings={session?.role === "traveller"}
          canFollow={session?.role === "traveller"}
        />
      </div>
    </main>
  );
}
