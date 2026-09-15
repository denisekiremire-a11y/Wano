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
    <main className="bg-paper">
      <section className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-ink">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(circle at 15% 15%, rgba(226,165,60,0.35), transparent 45%), radial-gradient(circle at 90% 85%, rgba(225,83,31,0.3), transparent 50%)",
            }}
          />
          <div className="relative px-6 py-16 md:px-14 md:py-24">
            <p className="eyebrow text-gold">Kampala · Discover. Connect. Experience.</p>
            <h1 className="font-editorial mt-4 max-w-2xl text-5xl font-bold leading-[0.95] text-white md:text-7xl">
              Kampala, wherever you <span className="text-gold">find it.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              Wano is the social discovery platform for Kampala and Uganda — places, events,
              experiences, restaurants, and communities, plus real bookings you can trust.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-vermilion px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-vermilion/20 transition hover:brightness-110"
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

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <p className="eyebrow text-vermilion">How you&apos;ll wander</p>
        <h2 className="font-editorial mt-2 text-3xl font-bold text-ink md:text-4xl">Four ways in</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-4">
          {[
            { icon: CompassIcon, title: "Explore", body: "Places, experiences and curated journeys across Kampala and beyond.", tone: "bg-ink text-white" },
            { icon: CalendarIcon, title: "Events", body: "Concerts, watch parties, festivals and meetups — mark yourself Going.", tone: "bg-gold text-ink" },
            { icon: ChatIcon, title: "Social", body: "Follow people, share moments, and find your community.", tone: "bg-vermilion text-white" },
            { icon: TicketIcon, title: "Book", body: "Real bookings, direct with the business — no fake payments, ever.", tone: "bg-ink text-white" },
          ].map((step, i) => (
            <div key={step.title} className={`rounded-2xl p-6 ${step.tone}`}>
              <p className="eyebrow opacity-70">{String(i + 1).padStart(2, "0")}</p>
              <step.icon className="mt-3 h-7 w-7 opacity-90" />
              <h3 className="font-editorial mt-4 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm opacity-80">{step.body}</p>
            </div>
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
            <p className="mt-1 text-sm text-forest-800/70">
              Curated itineraries built around why you&apos;re here, not just where you&apos;re going.
            </p>
          </div>
          <Link href="/explore" className="hidden text-sm font-semibold text-nile-700 sm:inline">
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
          <Link
            href="/signup"
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-marigold-400 bg-marigold-50 p-8 text-center transition hover:bg-marigold-100"
          >
            <TicketIcon className="h-8 w-8 text-marigold-700" />
            <p className="font-display text-lg font-semibold text-forest-900">
              Sign up to see member deals
            </p>
            <p className="text-sm text-forest-800/70">
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
            <p className="mt-1 text-sm text-forest-800/70">
              Restaurants, hotels, spas, experiences and transport — every Wano-verified place,
              browsable directly.
            </p>
          </div>
          <Link href="/explore" className="hidden text-sm font-semibold text-nile-700 sm:inline">
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

        <Link href="/explore" className="mt-6 inline-flex text-sm font-semibold text-nile-700 sm:hidden">
          Browse all →
        </Link>
      </section>
    </main>
  );
}
