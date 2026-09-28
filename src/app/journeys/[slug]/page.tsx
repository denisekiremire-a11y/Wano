import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JourneyArt } from "@/components/journey-art";
import { OfferTeaser } from "@/components/offer-teaser";
import { getJourneyBySlug, getJourneyStops, getPublicListingsForJourney, journeyHasCostRange } from "@/lib/data/journeys";
import { getPassportProgress, getTravellerProfileByUserId } from "@/lib/data/traveller";
import { journeyTheme } from "@/lib/journey-theme";
import { getSession } from "@/lib/session";
import { formatCostRange, formatListingPrice } from "@/lib/currency";

const STOP_TYPE_LABEL: Record<string, string> = {
  stay: "Stay",
  do: "Do",
  eat: "Eat",
  move: "Move",
  rest: "Rest",
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
    <main className="font-editorial-body bg-paper">
      <section
        className="relative overflow-hidden py-16 text-white"
        style={{ backgroundColor: theme.hero }}
      >
        {theme.image ? (
          <Image
            src={theme.image}
            alt=""
            fill
            sizes="100vw"
            priority
            unoptimized
            className="object-cover"
          />
        ) : (
          <JourneyArt slug={journey.slug} className="absolute inset-0 opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="relative mx-auto max-w-4xl px-4 md:px-6">
          <Link href="/journeys" className="eyebrow text-white/70 hover:text-white">
            ← All journeys
          </Link>
          <h1 className="font-serif-editorial mt-4 text-4xl md:text-6xl">{journey.name}</h1>
          <p className="mt-2 text-lg text-white/85">{journey.tagline}</p>
          <p className="font-mono-data mt-5 text-[11px] uppercase tracking-[0.15em] text-white/60">
            {journey.location}
            {" · "}
            {journey.targetAudience}
            {journeyHasCostRange(journey) &&
              ` · ${formatCostRange(journey.estCostMinMinor!, journey.estCostMaxMinor!, journey.currency)}`}
            {journey.durationDays &&
              ` · ${journey.durationDays} ${journey.durationDays === 1 ? "day" : "days"}`}
            {journey.difficulty && ` · ${journey.difficulty}`}
          </p>
          {journey.bestSeason && <p className="mt-2 text-sm text-white/70">Best: {journey.bestSeason}</p>}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <p className="max-w-2xl text-ink/60">{journey.description}</p>

        {days.length > 0 && (
          <div className="mt-8">
            <h2 className="font-serif-editorial text-2xl text-ink">The itinerary</h2>
            <div className="mt-4 border-t border-ink/10">
              {days.map((day) => (
                <div key={day} className="border-b border-ink/10 py-5">
                  <p className="eyebrow text-ember">Day {day}</p>
                  <div className="mt-3 space-y-3">
                    {stopsByDay.get(day)!.map(({ stop, listing, event }) => {
                      const href = listing ? `/explore/${listing.id}` : event ? `/events/${event.id}` : null;
                      const title = listing?.title ?? event?.title ?? stop.customName ?? "Stop";
                      const content = (
                        <div>
                          <p className="text-sm text-ink">
                            <span className="font-mono-data text-ink/40">{STOP_TYPE_LABEL[stop.stopType] ?? stop.stopType}</span>{" "}
                            {title}
                          </p>
                          {stop.note && <p className="mt-0.5 text-xs text-ink/50">{stop.note}</p>}
                        </div>
                      );
                      return href ? (
                        <Link key={stop.id} href={href} className="block transition-colors hover:text-ember">
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
          <p className={`mt-6 border-l-2 pl-4 text-sm ${unlocked ? "border-ember text-ink" : "border-ink/20 text-ink/60"}`}>
            {unlocked
              ? "You've earned this journey's stamp — discounts below are unlocked."
              : "Book any partner below to earn this journey's stamp and unlock its discounts."}
          </p>
        )}

        <h2 className="font-serif-editorial mt-10 text-2xl text-ink">Wano-verified businesses</h2>

        <div className="mt-4 border-t border-ink/10">
          {partners.length === 0 && (
            <p className="border-b border-ink/10 py-5 text-sm text-ink/50">
              Businesses for this journey are still being onboarded — check back soon.
            </p>
          )}
          {partners.map(({ listing, offer, vendor, promo }) => (
            <div
              key={listing.id}
              className="border-b border-ink/10 py-6 sm:flex sm:items-start sm:justify-between sm:gap-6"
            >
              <div className="flex-1">
                <p className="font-serif-editorial text-xl text-ink">
                  {listing.title}
                </p>
                <p className="text-sm text-ink/60">{vendor.businessName}</p>
                <p className="mt-1 text-sm text-ink/50">{listing.description}</p>
                <p className="font-mono-data mt-2 text-sm font-semibold" style={{ color: theme.hero }}>
                  {formatListingPrice(listing)}
                </p>
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

                {listing.externalBookingUrl ? (
                  <a
                    href={listing.externalBookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full rounded-full px-4 py-2 text-center text-sm font-semibold transition hover:opacity-90"
                    style={{ backgroundColor: theme.hero, color: theme.buttonText }}
                  >
                    Book on {vendor.businessName} →
                  </a>
                ) : session?.role === "traveller" ? (
                  <Link
                    href={`/explore/${listing.id}?journeyId=${journey.id}#book`}
                    className="block w-full rounded-full px-4 py-2 text-center text-sm font-semibold transition hover:opacity-90"
                    style={{ backgroundColor: theme.hero, color: theme.buttonText }}
                  >
                    Book this journey
                  </Link>
                ) : (
                  <Link
                    href={session ? "/" : `/login?next=/journeys/${journey.slug}`}
                    className="w-full rounded-full border border-ink/20 px-4 py-2 text-center text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
                  >
                    {session ? "Vendors browse, not book" : "Log in to book"}
                  </Link>
                )}
                <p className="text-center text-[11px] text-ink/40">
                  {listing.externalBookingUrl
                    ? `Booking happens on ${vendor.businessName}'s own platform.`
                    : `Booking creates a direct contract with ${vendor.businessName}.`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
