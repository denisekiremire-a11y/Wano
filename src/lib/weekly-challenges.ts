// Weekly Passport challenges. Three run Monday to Sunday (Kampala time):
// an easy one, an explore one and a themed one. They are proven only by
// venue check-ins (a venue scanning the member's QR or typing their backup
// code), never by tapping "done", and pay Passport XP only.
//
// Pure functions so the rules are unit-tested; the DB layer feeds them the
// week's check-ins.
import { LAUNCH_AREAS, type StampArea } from "@/lib/areas";

export type ChallengeRule =
  | { kind: "visits"; count: number }
  | { kind: "new_venues"; count: number }
  | { kind: "area"; area: StampArea; count: number }
  | { kind: "listing_type"; listingType: string; count: number };

export type ChallengeSlot = "easy" | "explore" | "theme";

export type ChallengeTemplate = {
  slot: ChallengeSlot;
  title: string;
  description: string;
  rule: ChallengeRule;
  xp: number;
};

/** One check-in, as the rules need it. */
export type CheckInFact = {
  vendorProfileId: string;
  area: string | null;
  listingTypes: string[];
};

const THEMES: Omit<ChallengeTemplate, "slot">[] = [
  ...LAUNCH_AREAS.map((area) => ({
    title: `A night in ${area}`,
    description: `Visit any Wano partner in ${area} this week.`,
    rule: { kind: "area" as const, area, count: 1 },
    xp: 250,
  })),
  {
    title: "Eat out twice",
    description: "Visit two different Wano restaurants or cafés this week.",
    rule: { kind: "listing_type", listingType: "restaurant", count: 2 },
    xp: 250,
  },
];

/** Whole weeks since Monday 7 Dec 2026 (launch week), so themes rotate. */
function weekIndex(weekStartIso: string): number {
  const ms = Date.parse(`${weekStartIso}T00:00:00Z`) - Date.parse("2026-12-07T00:00:00Z");
  return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
}

/** The default three challenges for a week. Deterministic, so the week's
 * set is the same however many times it is generated. */
export function defaultChallengesForWeek(weekStartIso: string): ChallengeTemplate[] {
  const i = weekIndex(weekStartIso);
  const theme = THEMES[((i % THEMES.length) + THEMES.length) % THEMES.length];
  return [
    {
      slot: "easy",
      title: "Out and about",
      description: "Check in at any Wano partner this week.",
      rule: { kind: "visits", count: 1 },
      xp: 100,
    },
    {
      slot: "explore",
      title: "Somewhere new",
      description: "Check in at two places you've never been with Wano.",
      rule: { kind: "new_venues", count: 2 },
      xp: 200,
    },
    { slot: "theme", ...theme },
  ];
}

/** How far a member is on one rule this week. `seenBefore` is every vendor
 * they checked in at before this week started. */
export function challengeProgress(
  rule: ChallengeRule,
  weekCheckIns: CheckInFact[],
  seenBefore: Set<string>,
): { progress: number; target: number; done: boolean } {
  let progress: number;
  switch (rule.kind) {
    case "visits":
      progress = weekCheckIns.length;
      break;
    case "new_venues":
      progress = new Set(weekCheckIns.map((c) => c.vendorProfileId).filter((id) => !seenBefore.has(id))).size;
      break;
    case "area":
      progress = new Set(weekCheckIns.filter((c) => c.area === rule.area).map((c) => c.vendorProfileId)).size;
      break;
    case "listing_type":
      progress = new Set(
        weekCheckIns.filter((c) => c.listingTypes.includes(rule.listingType)).map((c) => c.vendorProfileId),
      ).size;
      break;
  }
  const target = rule.count;
  return { progress: Math.min(progress, target), target, done: progress >= target };
}
