import Link from "next/link";
import { EventCard } from "@/components/event-card";
import {
  getAttendanceCounts,
  getDistinctEventCategories,
  getEventsForToday,
  getUpcomingEvents,
} from "@/lib/data/events";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; when?: string }>;
}) {
  const { category, when } = await searchParams;
  const isToday = when === "today";
  const [events, categories] = await Promise.all([
    isToday ? getEventsForToday(50) : getUpcomingEvents({ category }),
    getDistinctEventCategories(),
  ]);
  const counts = await getAttendanceCounts(events.map((e) => e.event.id));

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 md:px-6">
      <p className="text-xs font-medium uppercase tracking-wide text-nile-700">Wano Events</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-forest-900 md:text-4xl">
        What&apos;s happening in Kampala.
      </h1>
      <p className="mt-3 max-w-2xl text-forest-800/75">
        Concerts, watch parties, food nights, wellness meetups and more — mark yourself Going,
        Interested or Maybe and see who else is coming.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/events"
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            !category && !isToday ? "bg-forest-800 text-white" : "bg-forest-50 text-forest-800/70"
          }`}
        >
          All
        </Link>
        <Link
          href="/events?when=today"
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            isToday ? "bg-forest-800 text-white" : "bg-forest-50 text-forest-800/70"
          }`}
        >
          Today
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={`/events?category=${c}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${
              category === c ? "bg-forest-800 text-white" : "bg-forest-50 text-forest-800/70"
            }`}
          >
            {c}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map(({ event, organizer }) => (
          <EventCard
            key={event.id}
            event={event}
            organizerName={organizer?.businessName}
            counts={counts.get(event.id)}
          />
        ))}
        {events.length === 0 && (
          <p className="col-span-full rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
            {isToday
              ? "Nothing left today — check back tomorrow, or see everything upcoming."
              : "No upcoming events in this category yet — check back soon."}
          </p>
        )}
      </div>
    </main>
  );
}
