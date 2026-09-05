import { PartnerCard } from "@/components/partner-card";
import { PartnerSearchForm } from "@/components/partner-search-form";
import type { searchListings } from "@/lib/data/journeys";
import type { SessionPayload } from "@/lib/session";

type Journey = { id: string; slug: string; name: string };
type Results = Awaited<ReturnType<typeof searchListings>>;

export function ExploreView({
  results,
  journeyTagsByListing,
  imagesByListing,
  locations,
  unlockedJourneyIds,
  session,
  filters,
}: {
  results: Results;
  journeyTagsByListing: Map<string, Journey[]>;
  imagesByListing?: Map<string, string[]>;
  locations: string[];
  unlockedJourneyIds: Set<string>;
  session: SessionPayload | null;
  filters: { type?: string; location?: string; q?: string };
}) {
  return (
    <div>
      <PartnerSearchForm locations={locations} filters={filters} hiddenFields={{ view: "all" }} />

      <p className="mt-4 text-sm text-forest-800/60">
        {results.length} verified {results.length === 1 ? "place" : "places"} found
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {results.map((item) => {
          const tags = journeyTagsByListing.get(item.listing.id) ?? [];
          const unlocked =
            session != null && (tags.length === 0 || tags.some((t) => unlockedJourneyIds.has(t.id)));
          return (
            <PartnerCard
              key={item.listing.id}
              item={item}
              tags={tags}
              unlocked={unlocked}
              session={session}
              coverImageId={imagesByListing?.get(item.listing.id)?.[0]}
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
  );
}
