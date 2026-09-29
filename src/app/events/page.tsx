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
    <main className="font-editorial-body bg-paper">
      {/* Header — same asymmetric filter-bar pattern as /explore: heavy
          serif heading left, tabs staggered right rather than stacked
          full-width below. */}
      <section className="border-b border-ink/10">
        <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="eyebrow text-ember">Wano Events</p>
              <h1 className="font-serif-editorial mt-3 text-4xl leading-[0.98] text-ink md:text-5xl">
                What&apos;s happening in Kampala.
              </h1>
              <p className="mt-4 max-w-md text-ink/60">
                Concerts, watch parties, food nights, wellness meetups and more — mark yourself
                Going, Interested or Maybe and see who else is coming.
              </p>
            </div>

            <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:col-span-5 lg:justify-end">
              <Link
                href="/events"
                className={`eyebrow border-b-2 pb-1 transition-colors ${
                  !category && !isToday ? "border-ember text-ink" : "border-transparent text-ink/40 hover:text-ink"
                }`}
              >
                All
              </Link>
              <Link
                href="/events?when=today"
                className={`eyebrow border-b-2 pb-1 transition-colors ${
                  isToday ? "border-ember text-ink" : "border-transparent text-ink/40 hover:text-ink"
                }`}
              >
                Today
              </Link>
              {categories.map((c) => (
                <Link
                  key={c}
                  href={`/events?category=${c}`}
                  className={`eyebrow border-b-2 pb-1 capitalize transition-colors ${
                    category === c ? "border-ember text-ink" : "border-transparent text-ink/40 hover:text-ink"
                  }`}
                >
                  {c}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <p className="flex items-center gap-2 text-ink/40">
          <span className="live-dot text-ember" />
          <span className="font-mono-data text-[11px] uppercase tracking-[0.2em]">
            {events.length} {events.length === 1 ? "event" : "events"}
            {isToday ? " today" : category ? ` in ${category}` : " upcoming"}
          </span>
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map(({ event, organizer }) => (
            <EventCard
              key={event.id}
              event={event}
              organizerName={organizer?.businessName}
              counts={counts.get(event.id)}
            />
          ))}
          {events.length === 0 && (
            <p className="col-span-full border border-ink/10 bg-white p-6 text-center text-sm text-ink/50">
              {isToday
                ? "Nothing left today — check back tomorrow, or see everything upcoming."
                : "No upcoming events in this category yet — check back soon."}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
