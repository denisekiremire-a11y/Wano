import Image from "next/image";
import Link from "next/link";
import { AfconHero } from "@/components/afcon/afcon-hero";
import { EventCard } from "@/components/event-card";
import { JourneyArt } from "@/components/journey-art";
import { STADIUM_ANCHORS } from "@/lib/afcon/anchors";
import { getAttendanceCounts, getUpcomingEvents } from "@/lib/data/events";
import { getJourneys } from "@/lib/data/journeys";
import { AFCON_CLUB_ENABLED } from "@/lib/feature-flags";
import { journeyTheme } from "@/lib/journey-theme";

export default async function AfconHubPage() {
  const [journeyList, upcomingEvents] = await Promise.all([getJourneys(), getUpcomingEvents({ category: "afcon" })]);
  const counts = await getAttendanceCounts(upcomingEvents.map((e) => e.event.id));

  return (
    <main className="font-editorial-body bg-paper">
      {AFCON_CLUB_ENABLED ? (
        <AfconHero />
      ) : (
        <section className="relative overflow-hidden bg-ink">
          <Image
            src="/images/afcon-crowd.jpg"
            alt="Stadium crowd waving Uganda flags"
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(0deg, rgba(30,21,14,0.85) 0%, rgba(30,21,14,0.4) 55%, rgba(30,21,14,0) 80%)",
            }}
          />
          <div className="relative mx-auto max-w-5xl px-4 py-20 md:px-6">
            <p className="eyebrow mb-4 text-ember">Wano × AFCON 2027 — launch campaign</p>
            <h1 className="font-editorial max-w-2xl text-4xl font-bold leading-tight text-white md:text-5xl">
              Uganda&apos;s home for AFCON 2027 — and everything after it.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              19 Jun – 17 Jul 2027 · Co-hosted by Uganda, Kenya &amp; Tanzania. Discover fan zones,
              watch parties, and five curated Wano Journeys built for the tournament — then keep
              using Wano to discover Kampala long after the final whistle.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/explore"
                className="rounded-full bg-ember px-6 py-3 text-sm font-semibold text-white transition hover:bg-ember-hover"
              >
                Explore Wano Journeys
              </Link>
              <Link
                href="/events?category=afcon"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-white/90"
              >
                Fan zone events
              </Link>
            </div>
          </div>
        </section>
      )}

      {AFCON_CLUB_ENABLED && (
        <section className="mx-auto max-w-5xl px-4 pt-8 md:px-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-ember p-6 text-ink">
              <p className="eyebrow opacity-70">Tournament dates</p>
              <p className="font-editorial mt-2 text-2xl font-bold">19 Jun – 17 Jul 2027</p>
            </div>
            <div className="rounded-2xl bg-ember p-6 text-ink">
              <p className="eyebrow opacity-70">Host stadiums in Uganda</p>
              <p className="font-editorial mt-2 text-2xl font-bold">{Object.keys(STADIUM_ANCHORS).length} venues</p>
            </div>
            <div className="rounded-2xl bg-ember p-6 text-ink">
              <p className="eyebrow opacity-70">Kampala watch parties</p>
              <p className="font-editorial mt-2 text-2xl font-bold">Citywide</p>
            </div>
          </div>
        </section>
      )}

      {AFCON_CLUB_ENABLED && (
        <section className="mx-auto max-w-5xl px-4 py-12 md:px-6">
          <p className="eyebrow text-ember">Host stadiums</p>
          <h2 className="font-editorial mt-2 text-2xl font-bold text-ink">Where Uganda plays</h2>
          <p className="mt-1 text-sm text-ink/60">
            Match timetable, where to stay, where to eat, activities, and transport — narrowed down
            to whichever stadium your trip is built around.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {Object.values(STADIUM_ANCHORS).map((stadium) => (
              <Link
                key={stadium.id}
                href={`/afcon/${stadium.id}`}
                className="rounded-2xl border-2 border-ink bg-ink p-6 text-white transition hover:border-ember"
              >
                <p className="eyebrow text-ember">{stadium.circuit}</p>
                <p className="font-editorial mt-1 text-xl font-bold">{stadium.label}</p>
                <p className="mt-1.5 text-sm text-white/70">{stadium.circuitDescription}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ember">
                  Explore {stadium.shortLabel} →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {AFCON_CLUB_ENABLED && (
        <section className="mx-auto max-w-5xl px-4 pb-4 md:px-6">
          <div className="rounded-2xl bg-ink p-8 text-white md:p-10">
            <p className="eyebrow text-ember">Match day</p>
            <h2 className="font-editorial mt-2 text-3xl font-bold">Watch parties</h2>
            <p className="mt-1 text-sm text-white/50">Kampala-wide</p>
            <div className="mt-6 divide-y divide-white/10">
              {[
                { title: "City Fan Parks", body: "Open-air screens, food trucks and live music across central Kampala." },
                { title: "Rooftop Watch Lounges", body: "Reserved seating at verified rooftop bars and restaurants." },
                { title: "Community Screenings", body: "Neighbourhood grounds with local vendors and family seating." },
              ].map((item) => (
                <div key={item.title} className="py-4 first:pt-0 last:pb-0">
                  <h3 className="font-editorial text-lg font-bold">{item.title}</h3>
                  <p className="mt-1 text-sm text-white/60">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-5xl px-4 py-12 md:px-6">
        <p className="eyebrow text-ember">Wano Journeys</p>
        <h2 className="font-editorial mt-2 text-2xl font-bold text-ink">
          Five journeys built for AFCON travellers
        </h2>
        <p className="mt-1 text-sm text-ink/60">
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
                className="group overflow-hidden rounded-2xl border border-line bg-white transition hover:border-ember"
              >
                <div className="h-28 overflow-hidden" style={{ backgroundColor: theme.hero }}>
                  <JourneyArt slug={journey.slug} className="h-full w-full opacity-35" />
                </div>
                <div className="p-5">
                  <span
                    className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ backgroundColor: theme.tagBg, color: theme.hero }}
                  >
                    {journey.location}
                  </span>
                  <h3 className="font-editorial mt-3 text-lg font-bold text-ink">
                    {journey.name}
                  </h3>
                  <p className="mt-1 text-sm text-ink/60">{journey.tagline}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {upcomingEvents.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pb-14 md:px-6">
          <h2 className="font-editorial text-2xl font-bold text-ink">Fan zone events</h2>
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
        <div className="rounded-2xl border border-line bg-white p-6 text-sm text-ink/70">
          Wano curates and connects fans to verified places and experiences — it does not operate
          transport, accommodation, or tours itself, and match fixtures aren&apos;t published here
          until the tournament schedule is officially confirmed. Every booking made through Wano is
          a direct contract between you and the verified business.
        </div>
      </section>
    </main>
  );
}
