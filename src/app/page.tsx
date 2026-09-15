import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AfconPromoCard } from "@/components/afcon/afcon-promo-card";
import { CalendarIcon, ChatIcon, CompassIcon, TicketIcon } from "@/components/icons";
import { JourneyArt } from "@/components/journey-art";
import { PartnerCard } from "@/components/partner-card";
import { getBirthdayPerksForListings } from "@/lib/data/birthday";
import { AFCON_CLUB_ENABLED } from "@/lib/feature-flags";
import { getJourneyTagsForListings, getJourneys, searchListings } from "@/lib/data/journeys";
import { getListingImageIds } from "@/lib/data/listing-images";
import { getRatingSummaries } from "@/lib/data/reviews";
import { journeyTheme } from "@/lib/journey-theme";
import { getSession } from "@/lib/session";

export default async function LandingPage() {
  const session = await getSession();
  if (session?.role === "traveller") redirect("/passport");
  if (session?.role === "vendor") redirect("/vendor/dashboard");
  if (session?.role === "admin") redirect("/admin");

  const [journeyList, featured] = await Promise.all([getJourneys(), searchListings()]);
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
            <p className="eyebrow text-ember">Kampala · Discover. Connect. Experience.</p>
            <h1 className="font-editorial mt-4 max-w-2xl text-5xl font-bold leading-[0.95] text-white md:text-7xl">
              Kampala, wherever you <span className="text-ember">find it.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              Wano is the social discovery platform for Kampala and Uganda — places, events,
              experiences, restaurants, and communities, plus real bookings you can trust.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-ember px-6 py-3 text-sm font-semibold text-white transition hover:bg-ember-hover"
              >
                Join Wano free
              </Link>
              <Link
                href="/explore"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-white/90"
              >
                Explore without an account
              </Link>
            </div>
            <p className="mt-6 text-xs text-white/60">
              <Link href="/afcon" className="underline-offset-2 hover:underline">
                Wano × AFCON 2027
              </Link>{" "}
              is our launch campaign — 19 Jun – 17 Jul 2027, co-hosted by Uganda, Kenya &amp;
              Tanzania.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-24 md:px-6">
        <div className="flex items-baseline gap-4">
          <p className="eyebrow text-ember">How you&apos;ll wander</p>
          <h2 className="font-editorial text-4xl text-ink md:text-5xl">Four ways in</h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-4">
          {[
            { href: "/explore", icon: CompassIcon, title: "Explore", body: "Places, experiences and curated journeys across Kampala and beyond." },
            { href: "/events", icon: CalendarIcon, title: "Events", body: "Concerts, watch parties, festivals and meetups — mark yourself Going." },
            { href: "/social", icon: ChatIcon, title: "Social", body: "Follow people, share moments, and find your community." },
            { href: "/explore", icon: TicketIcon, title: "Book", body: "Real bookings, direct with the business — no fake payments, ever." },
          ].map((step, i) => (
            <Link
              key={step.title}
              href={step.href}
              className="rounded-[20px] border border-line bg-paper p-7 transition hover:border-ember"
            >
              <p className="eyebrow text-ember">{String(i + 1).padStart(2, "0")}</p>
              <step.icon className="mt-4 h-7 w-7 text-ink" />
              <h3 className="font-editorial mt-4 text-2xl text-ink">{step.title}</h3>
              <p className="mt-2 text-sm text-muted">{step.body}</p>
            </Link>
          ))}
        </div>
      </section>

      {AFCON_CLUB_ENABLED && (
        <section className="mx-auto max-w-6xl px-4 md:px-6">
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
