import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AfconPromoCard } from "@/components/afcon/afcon-promo-card";
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
  { href: "/explore?type=restaurant", label: "Eat & Drink" },
  { href: "/events", label: "Events & Nightlife" },
  { href: "/explore", label: "Explore Uganda" },
  { href: "/social", label: "Meet & Connect" },
];

const PERSONAS = [
  {
    href: "/explore",
    title: "I live here",
    body: "Find something to do today.",
    tags: "Events · Food · Friends · Experiences",
    cta: "Explore Kampala",
  },
  {
    href: "/journeys",
    title: "I'm visiting",
    body: "Make the most of your time in Uganda.",
    tags: "Journeys · Hotels · Experiences · Restaurants",
    cta: "Plan my trip",
  },
  {
    href: "/afcon",
    title: "I'm here for AFCON",
    body: "Turn match day into a Ugandan experience.",
    tags: "Food · Culture · Nightlife · Adventures",
    cta: "Explore AFCON",
  },
];

/** The one arrow the whole page uses, wherever a "go here" prompt appears
 * — text carries the invitation, the arrow just confirms it, so it earns
 * its keep as a shared 4px stroke rather than a swapped-in icon font.
 * `group/arrow` is a named group so it never collides with an image-hover
 * `group` further up the same link. */
function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      width="18"
      height="9"
      viewBox="0 0 18 9"
      fill="none"
      aria-hidden
      className={`shrink-0 transition-transform duration-300 ease-out group-hover/arrow:translate-x-1.5 ${className}`}
    >
      <path d="M0 4.5H17M17 4.5L12.5 0.5M17 4.5L12.5 8.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function ArrowLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`group/arrow inline-flex items-center gap-2.5 ${className}`}>
      <span>{children}</span>
      <Arrow />
    </Link>
  );
}

/** Replaces the old 4-box quick-link grid — a continuous, doubled strip
 * so the loop has no visible seam, large serif type instead of pill
 * buttons + emoji. Motion pauses on hover/focus so a reader can actually
 * click one without chasing it. */
function CategoryMarquee() {
  return (
    <div className="group/marquee overflow-hidden border-y border-ink/10">
      <div className="flex w-max gap-16 py-5 animate-marquee group-hover/marquee:[animation-play-state:paused] group-focus-within/marquee:[animation-play-state:paused]">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center gap-16" aria-hidden={copy === 1}>
            {CATEGORIES.map((c, i) => (
              <span key={c.label} className="flex shrink-0 items-center gap-16">
                <Link
                  href={c.href}
                  tabIndex={copy === 1 ? -1 : 0}
                  className="font-serif-editorial whitespace-nowrap text-3xl italic text-ink/55 transition-colors hover:text-ember sm:text-4xl"
                >
                  {c.label}
                </Link>
                {i < CATEGORIES.length - 1 && <span className="text-2xl text-ink/20">/</span>}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const session = await getSession();
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

  const [leadJourney, ...restJourneys] = journeyList;
  const [leadListing, ...restListings] = featuredListings;

  return (
    <main className="font-editorial-body bg-paper">
      {/* Hero — split-screen, not a stacked/centered banner: heavy
          left-aligned serif type against a sharp-edged, framed photo
          rather than text laid over a gradient-darkened image. */}
      <section className="border-b border-ink/10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-12">
          <div className="order-2 flex flex-col justify-center px-4 py-12 sm:px-6 lg:order-1 lg:col-span-6 lg:px-10 lg:py-0 xl:col-span-5 xl:px-16">
            <p className="eyebrow text-ember">Kampala · Uganda</p>
            <h1 className="font-serif-editorial mt-5 text-5xl leading-[0.94] text-ink sm:text-6xl lg:text-[3.7rem] xl:text-7xl">
              What do you want to do in Uganda?
            </h1>
            <p className="mt-6 max-w-sm text-lg text-ink/60">
              Find places. Discover experiences. Meet people. Build your trip.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-4">
              <ArrowLink href="/explore" className="text-base font-semibold text-ink">
                Explore Kampala
              </ArrowLink>
              <ArrowLink href="/journeys" className="text-base font-semibold text-ink/50 hover:text-ink">
                Plan a trip
              </ArrowLink>
            </div>
          </div>

          <div className="relative order-1 aspect-[5/4] lg:order-2 lg:col-span-6 lg:aspect-auto lg:min-h-[520px] xl:col-span-7">
            <div className="absolute inset-4 overflow-hidden lg:inset-8">
              <Image
                src="/images/kampala-golden-hour.jpg"
                alt="Kampala skyline at golden hour"
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                priority
                className="object-cover"
              />
            </div>
            <div className="pointer-events-none absolute inset-4 border border-white/25 lg:inset-8" />
            <div className="pointer-events-none absolute inset-0 border border-ink/10" />
          </div>
        </div>

        <CategoryMarquee />
      </section>

      {/* What's happening today */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-ember">Kampala, today</p>
            <h2 className="font-serif-editorial mt-2 text-3xl text-ink md:text-4xl">What&apos;s happening today?</h2>
          </div>
          <span className="hidden sm:inline-block">
            <ArrowLink href="/events?when=today" className="text-sm font-semibold text-ember">
              View everything
            </ArrowLink>
          </span>
        </div>

        {todayEvents.length > 0 ? (
          // Individually bordered cards, not a shared hairline-grid
          // background — todayEvents is rarely a full row (often 1-2 on a
          // quiet day), and a shared background under a partly-empty grid
          // paints the unused tracks as a solid block. A border per card
          // reads the same "sharp, gridded" way at any count.
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {todayEvents.map(({ event, organizer }) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group border border-ink/10 bg-white p-6 transition-colors hover:border-ember"
              >
                <p className="eyebrow text-ember">
                  {new Date(event.startAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </p>
                <h3 className="font-serif-editorial mt-3 text-xl text-ink">{event.title}</h3>
                <p className="mt-2 text-sm text-ink/55">
                  {event.location}
                  {organizer?.businessName ? ` · ${organizer.businessName}` : ""}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-8 border border-ink/10 bg-white px-6 py-10 text-center">
            <p className="text-sm text-ink/60">Nothing scheduled for today yet.</p>
            <ArrowLink href="/events" className="mt-3 text-sm font-semibold text-ember">
              See what&apos;s coming up
            </ArrowLink>
          </div>
        )}
        <span className="mt-5 block sm:hidden">
          <ArrowLink href="/events?when=today" className="text-sm font-semibold text-ember">
            View everything
          </ArrowLink>
        </span>
      </section>

      {/* Start here — an editorial list, not three matching cards.
          Numerals carry the rank instead of an icon-in-a-circle. */}
      <section className="mx-auto max-w-5xl px-4 py-16 md:px-6">
        <p className="eyebrow text-ember">Start here</p>
        <div className="mt-8 border-t border-ink/10">
          {PERSONAS.map((p, i) => (
            <Link
              key={p.title}
              href={p.href}
              className="group/row grid grid-cols-[2.5rem_1fr] items-center gap-5 border-b border-ink/10 py-8 sm:grid-cols-[4rem_1fr_auto] sm:gap-8"
            >
              <span className="font-serif-editorial text-3xl text-ink/25 transition-colors group-hover/row:text-ember sm:text-5xl">
                0{i + 1}
              </span>
              <div>
                <h3 className="font-serif-editorial text-2xl text-ink transition-colors group-hover/row:text-ember sm:text-4xl">
                  {p.title}
                </h3>
                <p className="mt-1.5 text-sm text-ink/55 sm:text-base">{p.body}</p>
                <p className="eyebrow mt-2.5 text-ink/35">{p.tags}</p>
              </div>
              <span className="col-span-2 mt-2 flex items-center gap-2.5 text-sm font-semibold text-ink/50 transition-colors group-hover/row:text-ember sm:col-span-1 sm:mt-0">
                <span className="hidden sm:inline">{p.cta}</span>
                <span
                  aria-hidden
                  className="inline-block transition-transform duration-300 ease-out group-hover/row:translate-x-1.5"
                >
                  <svg width="18" height="9" viewBox="0 0 18 9" fill="none">
                    <path d="M0 4.5H17M17 4.5L12.5 0.5M17 4.5L12.5 8.5" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {AFCON_CLUB_ENABLED && (
        <section className="mx-auto max-w-6xl px-4 pb-6 md:px-6">
          <AfconPromoCard />
        </section>
      )}

      {/* Wano Journeys — a photo-journalism composition: one journey leads
          at roughly 60% width, the rest stack in a tighter grid beside
          it, rather than a uniform row of identically sized cards. */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif-editorial text-3xl text-ink md:text-4xl">Wano Journeys</h2>
            <p className="mt-2 text-sm text-ink/60">
              Curated itineraries built around why you&apos;re here, not just where you&apos;re going.
            </p>
          </div>
          <span className="hidden sm:inline-block">
            <ArrowLink href="/explore" className="text-sm font-semibold text-ember">
              View all
            </ArrowLink>
          </span>
        </div>

        {leadJourney && (
          <div className="mt-8 grid gap-4 lg:grid-cols-12">
            {(() => {
              const theme = journeyTheme(leadJourney.slug);
              return (
                <Link
                  href={`/journeys/${leadJourney.slug}`}
                  className="group relative block aspect-[4/3] overflow-hidden lg:col-span-7 lg:aspect-auto"
                  style={{ backgroundColor: theme.hero }}
                >
                  {theme.image ? (
                    <Image
                      src={theme.image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 55vw, 100vw"
                      unoptimized
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.045]"
                    />
                  ) : (
                    <JourneyArt slug={leadJourney.slug} className="h-full w-full opacity-40" />
                  )}
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(0deg, rgba(20,14,9,0.78) 0%, rgba(20,14,9,0.05) 55%)" }}
                  />
                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                    <span
                      className="eyebrow inline-flex px-0 text-white/70"
                    >
                      {leadJourney.location}
                    </span>
                    <h3 className="font-serif-editorial mt-2 text-3xl text-white sm:text-4xl">{leadJourney.name}</h3>
                    <p className="mt-1.5 max-w-sm text-sm text-white/70">{leadJourney.tagline}</p>
                  </div>
                </Link>
              );
            })()}

            <div className="grid grid-cols-2 gap-4 lg:col-span-5 lg:grid-rows-2">
              {restJourneys.map((journey) => {
                const theme = journeyTheme(journey.slug);
                return (
                  <Link
                    key={journey.id}
                    href={`/journeys/${journey.slug}`}
                    className="group relative block aspect-square overflow-hidden"
                    style={{ backgroundColor: theme.hero }}
                  >
                    {theme.image ? (
                      <Image
                        src={theme.image}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 18vw, 50vw"
                        unoptimized
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                      />
                    ) : (
                      <JourneyArt slug={journey.slug} className="h-full w-full opacity-40" />
                    )}
                    <div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(0deg, rgba(20,14,9,0.75) 0%, rgba(20,14,9,0) 60%)" }}
                    />
                    <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
                      <h3 className="font-serif-editorial text-base leading-tight text-white sm:text-lg">
                        {journey.name}
                      </h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <Link
          href="/signup"
          className="group/row mt-4 flex items-center justify-between gap-4 border-t border-ink/10 py-6"
        >
          <div>
            <p className="font-serif-editorial text-xl italic text-ink sm:text-2xl">Sign up to see member deals</p>
            <p className="mt-1 text-sm text-ink/55">Deals unlock once you create a free account.</p>
          </div>
          <span className="hidden shrink-0 items-center gap-2.5 text-sm font-semibold text-ember sm:flex">
            Create account
            <span
              aria-hidden
              className="inline-block transition-transform duration-300 ease-out group-hover/row:translate-x-1.5"
            >
              <svg width="18" height="9" viewBox="0 0 18 9" fill="none">
                <path d="M0 4.5H17M17 4.5L12.5 0.5M17 4.5L12.5 8.5" stroke="currentColor" strokeWidth="1.3" />
              </svg>
            </span>
          </span>
        </Link>
      </section>

      {/* Trending places — same 60/40 asymmetric composition as Journeys
          above, built on the shared PartnerCard (used across the rest of
          the app, so its own markup stays untouched) inside a wider/
          narrower grid split rather than three equal columns. */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif-editorial text-3xl text-ink md:text-4xl">Trending places</h2>
            <p className="mt-2 text-sm text-ink/60">
              Restaurants, hotels, spas, experiences and transport — every Wano-verified place, browsable
              directly.
            </p>
          </div>
          <span className="hidden sm:inline-block">
            <ArrowLink href="/explore" className="text-sm font-semibold text-ember">
              Browse all
            </ArrowLink>
          </span>
        </div>

        {leadListing && (
          <div className="mt-8 grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <PartnerCard
                item={leadListing}
                tags={journeyTagsByListing.get(leadListing.listing.id) ?? []}
                unlocked={false}
                session={session}
                rating={ratings.get(leadListing.listing.id)}
                birthdayPerk={birthdayPerks.get(leadListing.listing.id)?.[0]}
                coverImageId={imagesByListing.get(leadListing.listing.id)?.[0]}
              />
            </div>
            <div className="grid gap-6 lg:col-span-5">
              {restListings.map((item) => (
                <PartnerCard
                  key={item.listing.id}
                  item={item}
                  tags={journeyTagsByListing.get(item.listing.id) ?? []}
                  unlocked={false}
                  session={session}
                  rating={ratings.get(item.listing.id)}
                  birthdayPerk={birthdayPerks.get(item.listing.id)?.[0]}
                  coverImageId={imagesByListing.get(item.listing.id)?.[0]}
                />
              ))}
            </div>
          </div>
        )}

        <span className="mt-6 block sm:hidden">
          <ArrowLink href="/explore" className="text-sm font-semibold text-ember">
            Browse all
          </ArrowLink>
        </span>
      </section>
    </main>
  );
}
