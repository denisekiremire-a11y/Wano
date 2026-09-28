import Link from "next/link";
import { notFound } from "next/navigation";
import { PartnerCard } from "@/components/partner-card";
import { EventCard } from "@/components/event-card";
import { VenueAnchorButton } from "@/components/afcon/venue-anchor-button";
import { STADIUM_ANCHORS, type StadiumAnchorId } from "@/lib/afcon/anchors";
import { estimateDistance, formatKm } from "@/lib/afcon/distance";
import { getAttendanceCounts, getUpcomingEvents } from "@/lib/data/events";
import { getJourneyTagsForListings, searchListings } from "@/lib/data/journeys";
import { getListingImageIds } from "@/lib/data/listing-images";
import { AFCON_CLUB_ENABLED } from "@/lib/feature-flags";
import { getSession } from "@/lib/session";
import type { ListingType } from "@/lib/listing-type";

function isVenueId(value: string): value is StadiumAnchorId {
  return value === "namboole" || value === "hoima";
}

const CATEGORIES: { type: ListingType; title: string; emptyMessage: string }[] = [
  { type: "hotel", title: "Where to stay", emptyMessage: "No accommodation listed near here yet." },
  { type: "restaurant", title: "Where to eat", emptyMessage: "No restaurants listed near here yet." },
  { type: "experience", title: "Activities", emptyMessage: "No activities listed near here yet." },
  { type: "transport", title: "Transport", emptyMessage: "No transport partners listed near here yet." },
];

export default async function AfconVenuePage({ params }: { params: Promise<{ venue: string }> }) {
  if (!AFCON_CLUB_ENABLED) notFound();
  const { venue: venueParam } = await params;
  if (!isVenueId(venueParam)) notFound();

  const stadium = STADIUM_ANCHORS[venueParam];
  const session = await getSession();

  const [matches, ...categoryResults] = await Promise.all([
    getUpcomingEvents({ category: "match", venueId: venueParam }),
    ...CATEGORIES.map((c) => searchListings({ type: c.type })),
  ]);
  const matchCounts = await getAttendanceCounts(matches.map((m) => m.event.id));

  const allListingIds = categoryResults.flat().map((r) => r.listing.id);
  const [journeyTagsByListing, imagesByListing] = await Promise.all([
    getJourneyTagsForListings(allListingIds),
    getListingImageIds(allListingIds),
  ]);

  return (
    <main className="font-editorial-body bg-paper">
      <section className="relative overflow-hidden bg-ink">
        <div className="relative mx-auto max-w-5xl px-4 py-14 md:px-6">
          <Link href="/afcon" className="eyebrow text-white/70 hover:text-white">
            ← AFCON 2027
          </Link>
          <p className="eyebrow mt-4 text-ember">{stadium.circuit}</p>
          <h1 className="font-editorial mt-3 max-w-2xl text-3xl font-bold text-white md:text-4xl">
            {stadium.label}
          </h1>
          <p className="mt-3 max-w-xl text-white/70">{stadium.circuitDescription}</p>
          <div className="mt-6">
            <VenueAnchorButton venueId={venueParam} label={stadium.shortLabel} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <h2 className="font-editorial text-2xl font-bold text-ink">Match timetable</h2>
        {matches.length === 0 ? (
          <p className="mt-3 border border-ink/10 bg-white p-5 text-sm text-ink/60">
            No matches confirmed for this venue yet — CAF hasn&apos;t made the draw. Check back once
            fixtures are announced.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map(({ event, organizer }) => (
              <EventCard
                key={event.id}
                event={event}
                organizerName={organizer?.businessName}
                counts={matchCounts.get(event.id)}
              />
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-ink/40">
          Open a match to book your Wano XP seat{session?.role === "traveller" ? "" : " (sign in as a traveller first)"}.
        </p>
      </section>

      {CATEGORIES.map((category, i) => {
        const results = categoryResults[i];
        const withDistance = results
          .map((item) => {
            const lat = item.listing.latitude != null ? Number(item.listing.latitude) : NaN;
            const lng = item.listing.longitude != null ? Number(item.listing.longitude) : NaN;
            const coords = Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null;
            return { item, distanceKm: coords ? estimateDistance(stadium.coordinates, coords).km : null };
          })
          .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));

        return (
          <section key={category.type} className="mx-auto max-w-5xl px-4 pb-10 md:px-6">
            <h2 className="font-editorial text-2xl font-bold text-ink">{category.title}</h2>
            <p className="mt-1 text-xs text-ink/40">Distance is an estimate from {stadium.label}.</p>
            {withDistance.length === 0 ? (
              <p className="mt-3 border border-ink/10 bg-white p-5 text-sm text-ink/50">
                {category.emptyMessage}
              </p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {withDistance.map(({ item, distanceKm }) => (
                  <div key={item.listing.id}>
                    {distanceKm != null && (
                      <p className="font-mono-data mb-1 text-xs font-medium text-ember">about {formatKm(distanceKm)} away</p>
                    )}
                    <PartnerCard
                      item={item}
                      tags={journeyTagsByListing.get(item.listing.id) ?? []}
                      unlocked={false}
                      session={session}
                      coverImageId={imagesByListing.get(item.listing.id)?.[0]}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
