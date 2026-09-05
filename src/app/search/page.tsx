import Link from "next/link";
import { formatListingPrice } from "@/lib/currency";
import { searchEvents } from "@/lib/data/events";
import { searchJournalPosts } from "@/lib/data/journal";
import { searchJourneys, searchListings } from "@/lib/data/journeys";
import { getListingImageIds } from "@/lib/data/listing-images";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const [listingResults, eventResults, journeyResults, journalResults] = query.length >= 2
    ? await Promise.all([
        searchListings({ query }),
        searchEvents(query),
        searchJourneys(query),
        searchJournalPosts(query),
      ])
    : [[], [], [], []];

  const imagesByListing = await getListingImageIds(listingResults.map((r) => r.listing.id));
  const totalResults = listingResults.length + eventResults.length + journeyResults.length + journalResults.length;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:px-6">
      <p className="text-xs font-medium uppercase tracking-wide text-nile-700">Search</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-forest-900 md:text-3xl">
        {query ? `Results for "${query}"` : "Search Wano"}
      </h1>

      {query.length > 0 && query.length < 2 && (
        <p className="mt-4 text-sm text-forest-800/60">Type at least 2 characters to search.</p>
      )}

      {query.length >= 2 && totalResults === 0 && (
        <p className="mt-6 rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
          Nothing matched &quot;{query}&quot;. Looking for a person instead?{" "}
          <Link href="/social" className="font-medium text-nile-700 hover:underline">
            Search people on Social
          </Link>
          .
        </p>
      )}

      {listingResults.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-forest-900">Places</h2>
          <div className="mt-3 space-y-2">
            {listingResults.map(({ listing, vendor }) => {
              const coverImageId = imagesByListing.get(listing.id)?.[0];
              return (
                <Link
                  key={listing.id}
                  href={`/explore/${listing.id}`}
                  className="flex items-center gap-3 rounded-xl border border-forest-900/10 bg-white p-3 transition hover:bg-forest-50/50"
                >
                  {coverImageId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/listing-images/${coverImageId}`}
                      alt=""
                      className="h-12 w-12 flex-none rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 flex-none rounded-lg bg-forest-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-forest-900">{listing.title}</p>
                    <p className="truncate text-xs text-forest-800/50">
                      {vendor.businessName} · {vendor.location}
                    </p>
                  </div>
                  <p className="flex-none text-xs font-medium text-nile-700">{formatListingPrice(listing)}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {eventResults.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-forest-900">Events</h2>
          <div className="mt-3 space-y-2">
            {eventResults.map(({ event }) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="block rounded-xl border border-forest-900/10 bg-white p-3 transition hover:bg-forest-50/50"
              >
                <p className="font-medium text-forest-900">{event.title}</p>
                <p className="text-xs text-forest-800/50">
                  {event.location} · {new Date(event.startAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {journeyResults.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-forest-900">Journeys</h2>
          <div className="mt-3 space-y-2">
            {journeyResults.map((journey) => (
              <Link
                key={journey.id}
                href={`/journeys/${journey.slug}`}
                className="block rounded-xl border border-forest-900/10 bg-white p-3 transition hover:bg-forest-50/50"
              >
                <p className="font-medium text-forest-900">{journey.name}</p>
                <p className="text-xs text-forest-800/50">{journey.tagline}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {journalResults.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-forest-900">Journal</h2>
          <div className="mt-3 space-y-2">
            {journalResults.map(({ post }) => (
              <Link
                key={post.id}
                href={`/journal/${post.slug}`}
                className="block rounded-xl border border-forest-900/10 bg-white p-3 transition hover:bg-forest-50/50"
              >
                <p className="font-medium text-forest-900">{post.title}</p>
                <p className="truncate text-xs text-forest-800/50">{post.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
