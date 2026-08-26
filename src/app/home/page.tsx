import Link from "next/link";
import { EventCard } from "@/components/event-card";
import { PartnerCard } from "@/components/partner-card";
import { SearchIcon } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { getBirthdayPerksForListings } from "@/lib/data/birthday";
import { getAttendanceCounts, getEventsStartingWithinHours } from "@/lib/data/events";
import { getJourneyTagsForListings, searchListings } from "@/lib/data/journeys";
import { getRatingSummaries } from "@/lib/data/reviews";
import {
  getPassportProgress,
  getSavedListingsForTraveller,
  getTravellerBookings,
  getTravellerProfileByUserId,
} from "@/lib/data/traveller";

const CATEGORIES = [
  { label: "Restaurants", type: "restaurant" },
  { label: "Hotels & Stays", type: "hotel" },
  { label: "Experiences", type: "experience" },
  { label: "Spa & Salon", type: "spa_salon" },
  { label: "Transport", type: "transport" },
];

export default async function HomeFeedPage() {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return null;

  const [todayEvents, featured, bookingRows, { progress }] = await Promise.all([
    getEventsStartingWithinHours(72, 3),
    searchListings(),
    getTravellerBookings(travellerProfile.id),
    getPassportProgress(travellerProfile.id),
  ]);
  const eventCounts = await getAttendanceCounts(todayEvents.map((e) => e.event.id));

  const featuredListings = featured.slice(0, 3);
  const [journeyTagsByListing, ratings, saved, birthdayPerks] = await Promise.all([
    getJourneyTagsForListings(featuredListings.map((r) => r.listing.id)),
    getRatingSummaries(featuredListings.map((r) => r.listing.id)),
    getSavedListingsForTraveller(travellerProfile.id),
    getBirthdayPerksForListings(featuredListings.map((r) => r.listing.id)),
  ]);
  const savedIds = new Set(saved.map((s) => s.listing.id));
  const hasBirthdaySet = travellerProfile.dateOfBirth != null;
  const unlockedJourneyIds = new Set(progress.filter((p) => p.earned).map((p) => p.journey.id));

  const recentBookings = bookingRows.slice(-3).reverse();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div>
        <p className="text-sm text-forest-800/60">Good to see you,</p>
        <h1 className="font-display text-2xl font-semibold text-forest-900">
          {session.name.split(" ")[0]}
        </h1>
      </div>

      <Link
        href="/explore"
        className="mt-4 flex items-center gap-2 rounded-full border border-forest-900/10 bg-white px-4 py-3 text-sm text-forest-800/60 shadow-sm transition hover:border-forest-900/20"
      >
        <SearchIcon className="h-4 w-4" />
        Search places, events, people…
      </Link>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <Link
            key={c.type}
            href={`/explore?type=${c.type}`}
            className="flex-none rounded-full bg-forest-50 px-4 py-2 text-sm font-medium text-forest-800 transition hover:bg-forest-100"
          >
            {c.label}
          </Link>
        ))}
      </div>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-xl font-semibold text-forest-900">Wano Today</h2>
          <Link href="/events" className="text-sm font-semibold text-nile-700">
            See all events →
          </Link>
        </div>
        <p className="mt-1 text-sm text-forest-800/60">What&apos;s happening here, right now.</p>
        {todayEvents.length === 0 ? (
          <p className="mt-4 rounded-xl border border-forest-900/10 bg-white p-5 text-sm text-forest-800/60">
            No events in the next few days yet — check the full events calendar.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {todayEvents.map(({ event, organizer }) => (
              <EventCard
                key={event.id}
                event={event}
                organizerName={organizer?.businessName}
                counts={eventCounts.get(event.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-xl font-semibold text-forest-900">Recommended for you</h2>
          <Link href="/explore" className="text-sm font-semibold text-nile-700">
            Explore all →
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredListings.map((item) => {
            const tags = journeyTagsByListing.get(item.listing.id) ?? [];
            const unlocked = tags.length === 0 || tags.some((t) => unlockedJourneyIds.has(t.id));
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
                hasBirthdaySet={hasBirthdaySet}
              />
            );
          })}
        </div>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-forest-900/10 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-forest-900">Recent bookings</h3>
            <Link href="/bookings" className="text-sm font-medium text-nile-700">
              View all →
            </Link>
          </div>
          {recentBookings.length === 0 ? (
            <p className="mt-2 text-sm text-forest-800/60">
              No bookings yet.{" "}
              <Link href="/explore" className="font-medium text-nile-700 hover:underline">
                Explore places
              </Link>{" "}
              to make your first one.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-forest-900/5">
              {recentBookings.map(({ booking, listing }) => (
                <li key={booking.id} className="flex items-center justify-between py-2 text-sm">
                  <p className="font-medium text-forest-900">{listing.title}</p>
                  <span className="rounded-full bg-forest-100 px-2.5 py-1 text-xs font-medium capitalize text-forest-800">
                    {booking.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link
          href="/afcon"
          className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-forest-900 via-forest-800 to-nile-800 p-5 text-white transition hover:shadow-lg"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-marigold-300">
              Wano × AFCON 2027
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold">
              The launch campaign, all in one hub.
            </h3>
            <p className="mt-1 text-sm text-white/80">
              Fan zones, watch parties, and the five Wano Journeys built for AFCON travellers.
            </p>
          </div>
          <span className="mt-4 text-sm font-semibold text-marigold-300">Visit the hub →</span>
        </Link>
      </section>
    </main>
  );
}
