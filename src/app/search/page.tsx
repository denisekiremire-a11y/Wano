import Link from "next/link";
import { formatListingPrice } from "@/lib/currency";
import { searchEvents } from "@/lib/data/events";
import { searchJournalPosts } from "@/lib/data/journal";
import { searchJourneys, searchListings } from "@/lib/data/journeys";
import { getListingImageIds } from "@/lib/data/listing-images";
import { searchTravellers } from "@/lib/data/social";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const [listingResults, eventResults, journeyResults, journalResults, peopleResults] = query.length >= 2
    ? await Promise.all([
        searchListings({ query }),
        searchEvents(query),
        searchJourneys(query),
        searchJournalPosts(query),
        searchTravellers(query, null),
      ])
    : [[], [], [], [], []];

  const imagesByListing = await getListingImageIds(listingResults.map((r) => r.listing.id));
  const totalResults =
    listingResults.length + eventResults.length + journeyResults.length + journalResults.length + peopleResults.length;

  return (
    <main className="font-editorial-body bg-paper">
      <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <p className="eyebrow text-ember">Search</p>
        <h1 className="font-serif-editorial mt-2 text-4xl text-ink md:text-5xl">
          {query ? `Results for "${query}"` : "Search Wano"}
        </h1>

        {query.length >= 2 && (
          <p className="mt-4 flex items-center gap-2 text-ink/40">
            <span className="live-dot text-ember" />
            <span className="font-mono-data text-[11px] uppercase tracking-[0.2em]">
              {totalResults} {totalResults === 1 ? "result" : "results"} found
            </span>
          </p>
        )}

        {query.length > 0 && query.length < 2 && (
          <p className="mt-4 text-sm text-ink/50">Type at least 2 characters to search.</p>
        )}

        {query.length >= 2 && totalResults === 0 && (
          <p className="mt-6 border border-ink/10 bg-white p-6 text-center text-sm text-ink/50">
            Nothing matched &quot;{query}&quot;.
          </p>
        )}

        {peopleResults.length > 0 && (
          <section className="mt-10 border-t border-ink/10 pt-6">
            <h2 className="font-serif-editorial text-2xl text-ink">People</h2>
            <div className="mt-3 border-t border-ink/10">
              {peopleResults.map(({ traveller, user }) => (
                <Link
                  key={traveller.id}
                  href={user.username ? `/profile/${user.username}` : "#"}
                  className="flex items-center gap-3 border-b border-ink/10 py-3 transition-colors hover:text-ember"
                >
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt="" className="h-12 w-12 flex-none rounded-full object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-ink/5 text-sm font-semibold text-ink/60">
                      {traveller.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{traveller.displayName}</p>
                    <p className="truncate text-xs text-ink/50">@{user.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {listingResults.length > 0 && (
          <section className="mt-10 border-t border-ink/10 pt-6">
            <h2 className="font-serif-editorial text-2xl text-ink">Places</h2>
            <div className="mt-3 border-t border-ink/10">
              {listingResults.map(({ listing, vendor }) => {
                const coverImageId = imagesByListing.get(listing.id)?.[0];
                return (
                  <Link
                    key={listing.id}
                    href={`/explore/${listing.id}`}
                    className="flex items-center gap-3 border-b border-ink/10 py-3 transition-colors hover:text-ember"
                  >
                    {coverImageId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/listing-images/${coverImageId}`}
                        alt=""
                        className="h-12 w-12 flex-none border border-ink/10 object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 flex-none border border-ink/10 bg-ink/5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{listing.title}</p>
                      {vendor.location && (
                        <p className="truncate text-xs text-ink/50">{vendor.location}</p>
                      )}
                    </div>
                    <p className="font-mono-data flex-none text-xs font-medium text-ember">{formatListingPrice(listing)}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {eventResults.length > 0 && (
          <section className="mt-10 border-t border-ink/10 pt-6">
            <h2 className="font-serif-editorial text-2xl text-ink">Events</h2>
            <div className="mt-3 border-t border-ink/10">
              {eventResults.map(({ event }) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="block border-b border-ink/10 py-3 transition-colors hover:text-ember"
                >
                  <p className="font-medium text-ink">{event.title}</p>
                  <p className="text-xs text-ink/50">
                    {event.location} · {new Date(event.startAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {journeyResults.length > 0 && (
          <section className="mt-10 border-t border-ink/10 pt-6">
            <h2 className="font-serif-editorial text-2xl text-ink">Journeys</h2>
            <div className="mt-3 border-t border-ink/10">
              {journeyResults.map((journey) => (
                <Link
                  key={journey.id}
                  href={`/journeys/${journey.slug}`}
                  className="block border-b border-ink/10 py-3 transition-colors hover:text-ember"
                >
                  <p className="font-medium text-ink">{journey.name}</p>
                  <p className="text-xs text-ink/50">{journey.tagline}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {journalResults.length > 0 && (
          <section className="mt-10 border-t border-ink/10 pt-6">
            <h2 className="font-serif-editorial text-2xl text-ink">Journal</h2>
            <div className="mt-3 border-t border-ink/10">
              {journalResults.map(({ post }) => (
                <Link
                  key={post.id}
                  href={`/journal/${post.slug}`}
                  className="block border-b border-ink/10 py-3 transition-colors hover:text-ember"
                >
                  <p className="font-medium text-ink">{post.title}</p>
                  <p className="truncate text-xs text-ink/50">{post.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
