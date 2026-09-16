import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AfconPromoCard } from "@/components/afcon/afcon-promo-card";
import { TicketIcon } from "@/components/icons";
import { JourneyArt } from "@/components/journey-art";
import { PartnerCard } from "@/components/partner-card";
import { getBirthdayPerksForListings } from "@/lib/data/birthday";
import { AFCON_CLUB_ENABLED } from "@/lib/feature-flags";
import { getEventsForToday } from "@/lib/data/events";
import { getJourneyTagsForListings, getJourneys, searchListings } from "@/lib/data/journeys";
import { getListingImageIds } from "@/lib/data/listing-images";
import { getRatingSummaries } from "@/lib/data/reviews";
import { journeyTheme } from "@/lib/journey-theme";
import { getSession } from "@/lib/session";

const CATEGORIES = [
  { href: "/explore?type=restaurant", emoji: "🍴", label: "Eat & Drink" },
  { href: "/events", emoji: "🎵", label: "Events & Nightlife" },
  { href: "/explore", emoji: "🌍", label: "Explore Uganda" },
  { href: "/social", emoji: "👥", label: "Meet & Connect" },
];

const PERSONAS = [
  {
    href: "/explore",
    emoji: "🇺🇬",
    title: "I live here",
    body: "Find something to do today.",
    tags: "Events · Food · Friends · Experiences",
    cta: "Explore Kampala →",
  },
  {
    href: "/journeys",
    emoji: "✈️",
    title: "I'm visiting",
    body: "Make the most of your time in Uganda.",
    tags: "Journeys · Hotels · Experiences · Restaurants",
    cta: "Plan my trip →",
  },
  {
    href: "/afcon",
    emoji: "⚽",
    title: "I'm here for AFCON",
    body: "Turn match day into a Ugandan experience.",
    tags: "Food · Culture · Nightlife · Adventures",
    cta: "Explore AFCON →",
  },
];

export default async function LandingPage() {
  const session = await getSession();
  if (session?.role === "traveller") redirect("/passport");
  if (session?.role === "vendor") redirect("/vendor/dashboard");
  if (session?.role === "admin") redirect("/admin");

  const [journeyList, featured, todayEvents] = await Promise.all([
    getJourneys(),
    searchListings(),
    getEventsForToday(4),
  ]);
  const featuredListings = featured.slice(0, 3);
  const [journeyTagsByListing, ratings, birthdayPerks, imagesByListing] = await Promise.all([
    getJourneyTagsForListings(featuredListings.map((r) => r.listing.id)),
    getRatingSummaries(featuredListings.map((r) => r.listing.id)),
    getBirthdayPerksForListings(featuredListings.map((r) => r.listing.id)),
    getListingImageIds(featuredListings.map((r) => r.listing.id)),
  ]);

  return (
    <main className="font-editorial-body bg-paper">
      <section className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-ink">
          <Image
            src="/images/kampala-golden-hour.jpg"
            alt="Kampala skyline at golden hour"
            fill
            sizes="(min-width: 1152px) 1120px, 100vw"
            priority
            className="object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(0deg, rgba(30,21,14,0.85) 0%, rgba(30,21,14,0.35) 55%, rgba(30,21,14,0) 80%)",
            }}
          />
          <div className="relative px-6 py-16 md:px-14 md:py-24">
            <p className="eyebrow text-ember">Kampala · Uganda</p>
            <h1 className="font-editorial mt-4 max-w-2xl text-5xl font-bold leading-[0.95] text-white md:text-6xl">
              What do you want to do in Uganda?
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              Find places. Discover experiences. Meet people. Build your trip.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              {CATEGORIES.map((c) => (
                <Link
                  key={c.label}
                  href={c.href}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20"
                >
                  <span aria-hidden>{c.emoji}</span>
                  {c.label}
                </Link>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/explore"
                className="rounded-full bg-ember px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink"
              >
                Explore Kampala
              </Link>
              <Link
                href="/journeys"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-gold"
              >
                Plan a Trip
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-ember">📍 Kampala</p>
            <h2 className="font-editorial mt-2 text-3xl text-ink md:text-4xl">
              What&apos;s happening today?
            </h2>
          </div>
          <Link href="/events?when=today" className="hidden text-sm font-semibold text-ember sm:inline">
            View everything →
          </Link>
        </div>

        {todayEvents.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {todayEvents.map(({ event, organizer }) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="rounded-2xl border border-line bg-white p-5 transition hover:border-ember"
              >
                <p className="eyebrow text-ember">
                  {new Date(event.startAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <h3 className="font-editorial mt-2 text-lg text-ink">{event.title}</h3>
                <p className="mt-1 text-sm text-ink/60">
                  {event.location}
                  {organizer?.businessName ? ` · ${organizer.businessName}` : ""}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-line bg-white p-6 text-center">
            <p className="text-sm text-ink/60">Nothing scheduled for today yet.</p>
            <Link href="/events" className="mt-2 inline-flex text-sm font-semibold text-ember">
              See what&apos;s coming up →
            </Link>
          </div>
        )}
        <Link href="/events?when=today" className="mt-4 inline-flex text-sm font-semibold text-ember sm:hidden">
          View everything →
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {PERSONAS.map((p) => (
            <Link
              key={p.title}
              href={p.href}
              className="rounded-2xl border border-line bg-white p-7 transition hover:border-ember"
            >
              <span className="text-3xl" aria-hidden>
                {p.emoji}
              </span>
              <h3 className="font-editorial mt-3 text-2xl text-ink">{p.title}</h3>
              <p className="mt-1 text-sm text-ink/70">{p.body}</p>
              <p className="eyebrow mt-3 text-ink/40">{p.tags}</p>
              <p className="mt-4 text-sm font-semibold text-ember">{p.cta}</p>
            </Link>
          ))}
        </div>
      </section>

      {AFCON_CLUB_ENABLED && (
        <section className="mx-auto max-w-6xl px-4 pb-6 md:px-6">
          <AfconPromoCard />
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-editorial text-2xl font-bold text-ink md:text-3xl">
              Wano Journeys
            </h2>
            <p className="mt-1 text-sm text-ink/60">
              Curated itineraries built around why you&apos;re here, not just where you&apos;re going.
            </p>
          </div>
          <Link href="/explore" className="hidden text-sm font-semibold text-ember sm:inline">
            View all →
          </Link>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {journeyList.map((journey) => {
            const theme = journeyTheme(journey.slug);
            return (
              <Link
                key={journey.id}
                href={`/journeys/${journey.slug}`}
                className="group overflow-hidden rounded-2xl border border-line bg-white transition hover:border-ember"
              >
                <div className={`h-28 overflow-hidden bg-gradient-to-br ${theme.gradient}`}>
                  <JourneyArt slug={journey.slug} className="h-full w-full opacity-90" />
                </div>
                <div className="p-5">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${theme.chip}`}>
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
          <Link
            href="/signup"
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line bg-paper p-8 text-center transition hover:bg-line/30"
          >
            <TicketIcon className="h-8 w-8 text-ember" />
            <p className="font-editorial text-lg font-bold text-ink">
              Sign up to see member deals
            </p>
            <p className="text-sm text-ink/60">
              Deals unlock once you create a free account.
            </p>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-editorial text-2xl font-bold text-ink md:text-3xl">
              Trending places
            </h2>
            <p className="mt-1 text-sm text-ink/60">
              Restaurants, hotels, spas, experiences and transport — every Wano-verified place,
              browsable directly.
            </p>
          </div>
          <Link href="/explore" className="hidden text-sm font-semibold text-ember sm:inline">
            Browse all →
          </Link>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredListings.map((item) => {
            const tags = journeyTagsByListing.get(item.listing.id) ?? [];
            return (
              <PartnerCard
                key={item.listing.id}
                item={item}
                tags={tags}
                unlocked={false}
                session={session}
                rating={ratings.get(item.listing.id)}
                birthdayPerk={birthdayPerks.get(item.listing.id)?.[0]}
                coverImageId={imagesByListing.get(item.listing.id)?.[0]}
              />
            );
          })}
        </div>

        <Link href="/explore" className="mt-6 inline-flex text-sm font-semibold text-ember sm:hidden">
          Browse all →
        </Link>
      </section>
    </main>
  );
}
