import type { StadiumAnchorId } from "@/lib/afcon/anchors";
import { AFCON_KICKOFF } from "@/lib/afcon/anchors";

export type SeasonPhase = "off" | "buildup" | "live" | "matchday" | "afterglow";

export type FixtureLite = {
  id: string;
  home: string;
  away: string;
  kickoff: Date;
  venueId: StadiumAnchorId;
  venue: string;
  stage: string;
};

// The tournament itself: 19 Jun – 18 Jul 2027 (AFCON_KICKOFF lives in the
// anchor system — imported, never redefined). Buildup opens a fixed window
// before kickoff rather than forever, and afterglow runs through the end
// of August — both boundaries exist so the skin retires itself with no one
// having to remember to flip a flag off in September 2027.
const BUILDUP_DAYS_BEFORE_KICKOFF = 45;
export const AFCON_END = new Date("2027-07-18T21:00:00Z"); // 2027-07-19 00:00 EAT
export const BUILDUP_START = new Date(AFCON_KICKOFF.getTime() - BUILDUP_DAYS_BEFORE_KICKOFF * 24 * 60 * 60 * 1000);
export const AFTERGLOW_END = new Date("2027-08-31T21:00:00Z"); // 2027-09-01 00:00 EAT

const KAMPALA_TZ = "Africa/Kampala";
const kampalaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: KAMPALA_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Uganda has no DST and one timezone nationwide, so "today" for the
 * matchday check is always Africa/Kampala's calendar date — never the
 * viewer's own, and never the server's. */
export function isSameKampalaDay(a: Date, b: Date): boolean {
  return kampalaDateFormatter.format(a) === kampalaDateFormatter.format(b);
}

export function daysUntil(target: Date, from: Date): number {
  return Math.max(0, Math.ceil((target.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));
}

export function computeSeasonPhase(now: Date, todaysFixture: FixtureLite | null): SeasonPhase {
  if (now < BUILDUP_START) return "off";
  if (now < AFCON_KICKOFF) return "buildup";
  if (now <= AFCON_END) return todaysFixture ? "matchday" : "live";
  if (now <= AFTERGLOW_END) return "afterglow";
  return "off";
}

/** The fixture (if any) at a Uganda venue landing on today's Kampala date. */
export function getTodaysFixture(fixtures: FixtureLite[], now: Date): FixtureLite | null {
  return fixtures.find((f) => isSameKampalaDay(f.kickoff, now)) ?? null;
}

/** The soonest upcoming Uganda-venue fixture, for buildup/live copy and as
 * MatchCard's fallback when there's no fixture today specifically. */
export function getNextFixture(fixtures: FixtureLite[], now: Date): FixtureLite | null {
  const upcoming = fixtures.filter((f) => f.kickoff.getTime() >= now.getTime()).sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());
  return upcoming[0] ?? fixtures[0] ?? null;
}
