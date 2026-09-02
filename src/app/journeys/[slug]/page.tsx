import Link from "next/link";
import { notFound } from "next/navigation";
import { bookListingFormAction } from "@/lib/actions/booking-actions";
import { JourneyArt } from "@/components/journey-art";
import { OfferTeaser } from "@/components/offer-teaser";
import { getJourneyBySlug, getJourneyStops, getPublicListingsForJourney, journeyHasCostRange } from "@/lib/data/journeys";
import { getPassportProgress, getTravellerProfileByUserId } from "@/lib/data/traveller";
import { journeyTheme } from "@/lib/journey-theme";
import { getSession } from "@/lib/session";
import { formatCostRange } from "@/lib/currency";

const STOP_TYPE_LABEL: Record<string, string> = {
  stay: "🛏️ Stay",
  do: "🎟️ Do",
  eat: "🍽️ Eat",
  move: "🚗 Move",
  rest: "🧘 Rest",
};

export default async function JourneyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const journey = await getJourneyBySlug(slug);
  if (!journey) notFound();

  const [session, partners, stops] = await Promise.all([
    getSession(),
    getPublicListingsForJourney(journey.id),
    getJourneyStops(journey.id),
  ]);

  const stopsByDay = new Map<number, typeof stops>();
  for (const row of stops) {
    const list = stopsByDay.get(row.stop.dayNumber) ?? [];
    list.push(row);
    stopsByDay.set(row.stop.dayNumber, list);
  }
  const days = [...stopsByDay.keys()].sort((a, b) => a - b);

  let unlocked = false;
  if (session?.role === "traveller") {
    const travellerProfile = await getTravellerProfileByUserId(session.userId);
    if (travellerProfile) {
      const { progress } = await getPassportProgress(travellerProfile.id);
      unlocked = progress.some((p) => p.journey.id === journey.id && p.earned);
    }
  }

  const theme = journeyTheme(journey.slug);

  return (
    <main>
      <section className={`relative overflow-hidden bg-gradient-to-br ${theme.gradient} py-16 text-white`}>
        <JourneyArt slug={journey.slug} className="absolute inset-0 opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        <div className="relative mx-auto max-w-4xl px-4 md:px-6">
          <Link href="/journeys" className="text-sm text-white/80 hover:underline">
            ← All journeys
          </Link>
          <h1 className="mt-3 font-display text-3xl font-semibold md:text-5xl">
            {journey.name}
          </h1>
          <p className="mt-2 text-white/90">{journey.tagline}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-white/15 px-3 py-1">{journey.location}</span>
            <span className="rounded-full bg-white/15 px-3 py-1">{journey.targetAudience}</span>
            {journeyHasCostRange(journey) && (
              <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">
                {formatCostRange(journey.estCostMinMinor!, journey.estCostMaxMinor!, journey.currency)}
              </span>
            )}
            {journey.durationDays && (
              <span className="rounded-full bg-white/15 px-3 py-1">
                {journey.durationDays} {journey.durationDays === 1 ? "day" : "days"}
              </span>
            )}
            {journey.difficulty && <span className="rounded-full bg-white/15 px-3 py-1">{journey.difficulty}</span>}
          </div>
          {journey.bestSeason && <p className="mt-2 text-sm text-white/70">Best: {journey.bestSeason}</p>}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <p className="max-w-2xl text-forest-800/80">{journey.description}</p>

        {days.length > 0 && (
          <div className="mt-6">
            <h2 className="font-display text-xl font-semibold text-forest-900">The itinerary</h2>
            <div className="mt-3 space-y-4">
              {days.map((day) => (
                <div key={day}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-forest-800/50">Day {day}</p>
                  <div className="mt-2 space-y-2">
                    {stopsByDay.get(day)!.map(({ stop, listing, event }) => {
                      const href = listing ? `/explore/${listing.id}` : event ? `/events/${event.id}` : null;
                      const title = listing?.title ?? event?.title ?? stop.customName ?? "Stop";
                      const content = (
                        <div className="rounded-xl border border-forest-900/10 bg-white p-3">
                          <p className="text-sm font-medium text-forest-900">
                            {STOP_TYPE_LABEL[stop.stopType] ?? stop.stopType} {title}
                          </p>
                          {stop.note && <p className="mt-0.5 text-xs text-forest-800/60">{stop.note}</p>}
                        </div>
                      );
                      return href ? (
                        <Link key={stop.id} href={href} className="block transition hover:border-forest-900/20">
                          {content}
                        </Link>
                      ) : (
                        <div key={stop.id}>{content}</div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {session?.role === "traveller" && (
          <p
            className={`mt-4 inline-flex rounded-full px-3 py-1 text-sm font-medium ${
              unlocked ? "bg-forest-100 text-forest-800" : "bg-marigold-100 text-marigold-800"
            }`}
          >
            {unlocked
              ? "You've earned this journey's stamp — discounts below are unlocked."
              : "Book any partner below to earn this journey's stamp and unlock its discounts."}
          </p>
        )}

        <h2 className="mt-8 font-display text-xl font-semibold text-forest-900">
          Wano-verified businesses
        </h2>

        <div className="mt-4 space-y-4">
          {partners.length === 0 && (
            <p className="rounded-xl border border-forest-900/10 bg-white p-5 text-sm text-forest-800/60">
              Businesses for this journey are still being onboarded — check back soon.
            </p>
          )}
          {partners.map(({ listing, offer, vendor, promo }) => (
            <div
              key={listing.id}
              className="rounded-2xl border border-forest-900/10 bg-white p-5 sm:flex sm:items-start sm:justify-between sm:gap-6"
            >
              <div className="flex-1">
                <p className="font-display text-lg font-semibold text-forest-900">
                  {listing.title}
                </p>
                <p className="text-sm text-forest-800/70">{vendor.businessName}</p>
                <p className="mt-1 text-sm text-forest-800/60">{listing.description}</p>
                <p className="mt-2 text-sm font-medium text-nile-700">{listing.priceHint}</p>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:mt-0 sm:w-64">
                {offer && (
                  <OfferTeaser
                    discountText={offer.discountText}
                    freebieText={offer.freebieText}
                    unlocked={unlocked}
                    unlockHint={session ? "Book to unlock" : "Sign up to unlock"}
                    unlockHref={session ? "#partners" : "/signup"}
                  />
                )}
                {promo && (
                  <OfferTeaser
                    discountText={`${promo.code} — ${promo.discountText}`}
                    freebieText={promo.freebieText}
                    unlocked={unlocked}
                    unlockHint={session ? "Book to unlock" : "Sign up to unlock"}
                    unlockHref={session ? "#partners" : "/signup"}
                  />
                )}

                {session?.role === "traveller" ? (
                  <form action={bookListingFormAction}>
                    <input type="hidden" name="listingId" value={listing.id} />
                    <input type="hidden" name="journeyId" value={journey.id} />
                    <button
                      type="submit"
                      className="w-full rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-700"
                    >
                      Book this journey
                    </button>
                  </form>
                ) : (
                  <Link
                    href={session ? "/" : `/login?next=/journeys/${journey.slug}`}
                    className="w-full rounded-full border border-forest-800/20 px-4 py-2 text-center text-sm font-semibold text-forest-800 transition hover:bg-forest-800/5"
                  >
                    {session ? "Vendors browse, not book" : "Log in to book"}
                  </Link>
                )}
                <p className="text-center text-[11px] text-forest-800/50">
                  Booking creates a direct contract with {vendor.businessName}.
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
