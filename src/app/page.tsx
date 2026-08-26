import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarIcon, ChatIcon, CompassIcon, TicketIcon } from "@/components/icons";
import { JourneyArt } from "@/components/journey-art";
import { PartnerCard } from "@/components/partner-card";
import { getBirthdayPerksForListings } from "@/lib/data/birthday";
import { getJourneyTagsForListings, getJourneys, searchListings } from "@/lib/data/journeys";
import { getRatingSummaries } from "@/lib/data/reviews";
import { journeyTheme } from "@/lib/journey-theme";
import { getSession } from "@/lib/session";

export default async function LandingPage() {
  const session = await getSession();
  if (session?.role === "traveller") redirect("/home");
  if (session?.role === "vendor") redirect("/vendor/dashboard");
  if (session?.role === "admin") redirect("/admin");

  const [journeyList, featured] = await Promise.all([getJourneys(), searchListings()]);
  const featuredListings = featured.slice(0, 3);
  const [journeyTagsByListing, ratings, birthdayPerks] = await Promise.all([
    getJourneyTagsForListings(featuredListings.map((r) => r.listing.id)),
    getRatingSummaries(featuredListings.map((r) => r.listing.id)),
    getBirthdayPerksForListings(featuredListings.map((r) => r.listing.id)),
  ]);

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
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-marigold-300">
            Discover. Connect. Experience.
          </p>
          <h1 className="max-w-2xl font-display text-4xl font-semibold leading-tight text-white md:text-6xl">
            Kampala, wherever you find it.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-forest-100">
            Wano is the social discovery platform for Kampala and Uganda — places, events,
            experiences, restaurants, and communities, plus real bookings you can trust.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-marigold-500 px-6 py-3 text-sm font-semibold text-forest-950 shadow-lg shadow-marigold-500/20 transition hover:bg-marigold-400"
            >
              Join Wano free
            </Link>
            <Link
              href="/explore"
              className="rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Explore without an account
            </Link>
          </div>
          <p className="mt-6 text-xs text-forest-200/80">
            <Link href="/afcon" className="underline-offset-2 hover:underline">
              Wano × AFCON 2027
            </Link>{" "}
            is our launch campaign — 19 Jun – 17 Jul 2027, co-hosted by Uganda, Kenya &amp;
            Tanzania.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="grid gap-6 sm:grid-cols-4">
          {[
            { icon: CompassIcon, title: "Explore", body: "Places, experiences and curated journeys across Kampala and beyond." },
            { icon: CalendarIcon, title: "Events", body: "Concerts, watch parties, festivals and meetups — mark yourself Going." },
            { icon: ChatIcon, title: "Social", body: "Follow people, share moments, and find your community." },
            { icon: TicketIcon, title: "Book", body: "Real bookings, direct with the business — no fake payments, ever." },
          ].map((step) => (
            <div key={step.title} className="rounded-2xl border border-forest-900/10 bg-white p-6">
              <step.icon className="h-8 w-8 text-forest-700" />
              <h3 className="mt-4 font-display text-lg font-semibold text-forest-900">{step.title}</h3>
              <p className="mt-2 text-sm text-forest-800/70">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-forest-900 md:text-3xl">
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
              Deals unlock once you create a free account and start your Wano Passport.
            </p>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-forest-900 md:text-3xl">
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
