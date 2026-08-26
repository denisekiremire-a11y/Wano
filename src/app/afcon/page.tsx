import Link from "next/link";
import { EventCard } from "@/components/event-card";
import { JourneyArt } from "@/components/journey-art";
import { getAttendanceCounts, getUpcomingEvents } from "@/lib/data/events";
import { getJourneys } from "@/lib/data/journeys";
import { journeyTheme } from "@/lib/journey-theme";

export default async function AfconHubPage() {
  const [journeyList, upcomingEvents] = await Promise.all([getJourneys(), getUpcomingEvents({ category: "afcon" })]);
  const counts = await getAttendanceCounts(upcomingEvents.map((e) => e.event.id));

  return (
    <main>
      <section className="relative overflow-hidden bg-forest-950">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(224,161,28,0.25), transparent 45%), radial-gradient(circle at 85% 0%, rgba(42,148,189,0.35), transparent 40%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-20 md:px-6">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-marigold-300">
            Wano × AFCON 2027 — launch campaign
          </p>
          <h1 className="max-w-2xl font-display text-4xl font-semibold leading-tight text-white md:text-5xl">
            Uganda&apos;s home for AFCON 2027 — and everything after it.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-forest-100">
            19 Jun – 17 Jul 2027 · Co-hosted by Uganda, Kenya &amp; Tanzania. Discover fan zones,
            watch parties, and five curated Wano Journeys built for the tournament — then keep
            using Wano to discover Kampala long after the final whistle.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/explore"
              className="rounded-full bg-marigold-500 px-6 py-3 text-sm font-semibold text-forest-950 shadow-lg shadow-marigold-500/20 transition hover:bg-marigold-400"
            >
              Explore Wano Journeys
            </Link>
            <Link
              href="/events?category=afcon"
              className="rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Fan zone events
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 md:px-6">
        <h2 className="font-display text-2xl font-semibold text-forest-900">
          Five journeys built for AFCON travellers
        </h2>
        <p className="mt-1 text-sm text-forest-800/70">
          Every journey below is browsable in Explore year-round — these five are just the ones
          purpose-built for the tournament window.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {journeyList.map((journey) => {
            const theme = journeyTheme(journey.slug);
            return (
              <Link
                key={journey.id}
                href={`/journeys/${journey.slug}`}
                className="group overflow-hidden rounded-2xl border border-forest-900/10 bg-white transition hover:shadow-lg"
              >
                <div className={`h-28 overflow-hidden bg-gradient-to-br ${theme.gradient}`}>
                  <JourneyArt slug={journey.slug} className="h-full w-full opacity-90" />
                </div>
                <div className="p-5">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${theme.chip}`}>
                    {journey.location}
                  </span>
                  <h3 className="mt-3 font-display text-lg font-semibold text-forest-900">
                    {journey.name}
                  </h3>
                  <p className="mt-1 text-sm text-forest-800/70">{journey.tagline}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {upcomingEvents.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pb-14 md:px-6">
          <h2 className="font-display text-2xl font-semibold text-forest-900">Fan zone events</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map(({ event, organizer }) => (
              <EventCard
                key={event.id}
                event={event}
                organizerName={organizer?.businessName}
                counts={counts.get(event.id)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-5xl px-4 pb-14 md:px-6">
        <div className="rounded-2xl border border-forest-900/10 bg-forest-50 p-6 text-sm text-forest-800/75">
          Wano curates and connects fans to verified places and experiences — it does not operate
          transport, accommodation, or tours itself, and match fixtures aren&apos;t published here
          until the tournament schedule is officially confirmed. Every booking made through Wano is
          a direct contract between you and the verified business.
        </div>
      </section>
    </main>
  );
}
