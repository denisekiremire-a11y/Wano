// Builds the home page's "Kampala, today" list. The rule is simple: the list
// is never empty. It fills from the most useful source down and stops at the
// limit, so a quiet Tuesday still shows perks, the weekend and a journey
// instead of "Nothing scheduled for today yet."
//
// Pure function on purpose (no DB) so the fallback order is unit-tested.

export type TonightEvent = {
  id: string;
  title: string;
  startAt: Date;
  location: string;
  organizerName: string | null;
  isWeeklyRegular: boolean;
};

export type TonightPerk = {
  rewardId: string;
  title: string;
  listingId: string;
  listingTitle: string;
  vendorName: string;
};

export type TonightJourney = { slug: string; name: string; tagline: string };

export type TonightCard =
  | {
      kind: "today" | "weekend";
      key: string;
      eventId: string;
      href: string;
      title: string;
      startAt: Date;
      place: string;
      /** Organiser name, or null when Wano listed it without a partner. */
      organizerName: string | null;
      isWeeklyRegular: boolean;
    }
  | { kind: "perk"; key: string; href: string; title: string; place: string }
  | { kind: "journey"; key: string; href: string; title: string; place: string };

export const TONIGHT_LIMIT = 6;
/** Perks are a filler, not the headline: cap them so the weekend still shows. */
export const TONIGHT_MAX_PERKS = 2;
/** Below this many cards the section looks thin, so a journey is added. */
export const TONIGHT_MIN_BEFORE_JOURNEY = 3;

export function assembleTonight(
  input: {
    today: TonightEvent[];
    perks: TonightPerk[];
    weekend: TonightEvent[];
    journey: TonightJourney | null;
  },
  limit = TONIGHT_LIMIT,
): TonightCard[] {
  const cards: TonightCard[] = [];
  const seenEvents = new Set<string>();

  const pushEvent = (kind: "today" | "weekend", e: TonightEvent) => {
    if (cards.length >= limit || seenEvents.has(e.id)) return;
    seenEvents.add(e.id);
    cards.push({
      kind,
      key: `${kind}:${e.id}`,
      eventId: e.id,
      href: `/events/${e.id}`,
      title: e.title,
      startAt: e.startAt,
      place: e.location,
      organizerName: e.organizerName,
      isWeeklyRegular: e.isWeeklyRegular,
    });
  };

  for (const e of input.today) pushEvent("today", e);

  for (const p of input.perks.slice(0, TONIGHT_MAX_PERKS)) {
    if (cards.length >= limit) break;
    cards.push({
      kind: "perk",
      key: `perk:${p.rewardId}`,
      href: `/explore/${p.listingId}`,
      title: p.title,
      place: p.vendorName === p.listingTitle ? p.listingTitle : `${p.listingTitle} · ${p.vendorName}`,
    });
  }

  for (const e of input.weekend) pushEvent("weekend", e);

  if (input.journey && cards.length < Math.min(limit, TONIGHT_MIN_BEFORE_JOURNEY)) {
    cards.push({
      kind: "journey",
      key: `journey:${input.journey.slug}`,
      href: `/journeys/${input.journey.slug}`,
      title: input.journey.name,
      place: input.journey.tagline,
    });
  }

  return cards;
}
