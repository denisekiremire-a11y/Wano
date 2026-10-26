import { describe, expect, it } from "vitest";
import {
  kampalaDayBounds,
  kampalaUpcomingWeekend,
  kampalaWeekday,
  parseKampalaLocal,
  weeklyOccurrences,
} from "@/lib/kampala-time";
import { assembleTonight, TONIGHT_MAX_PERKS, type TonightEvent, type TonightPerk } from "@/lib/tonight";

const iso = (d: Date) => d.toISOString();

function ev(id: string, title = id): TonightEvent {
  return { id, title, startAt: new Date("2026-12-03T17:00:00Z"), location: "Kololo", organizerName: null, isWeeklyRegular: false };
}

function perk(id: string): TonightPerk {
  return { rewardId: id, title: `Perk ${id}`, listingId: `l-${id}`, listingTitle: "Cafe", vendorName: "Cafe" };
}

const journey = { slug: "kampala-city-experience", name: "Kampala City Experience", tagline: "A day in the city" };

describe("Kampala time helpers", () => {
  it("treats 22:30 UTC as the next Kampala day (01:30 local)", () => {
    const { start, end } = kampalaDayBounds(new Date("2026-12-03T22:30:00Z"));
    expect(iso(start)).toBe("2026-12-03T21:00:00.000Z"); // 4 Dec 00:00 Kampala
    expect(iso(end)).toBe("2026-12-04T21:00:00.000Z");
  });

  it("parses datetime-local input as Kampala time", () => {
    expect(iso(parseKampalaLocal("2026-12-03T19:30")!)).toBe("2026-12-03T16:30:00.000Z");
    expect(parseKampalaLocal("not a date")).toBeNull();
  });

  it("repeats a weekly event at the same local time", () => {
    const dates = weeklyOccurrences(parseKampalaLocal("2026-12-03T19:30")!, 3).map(iso);
    expect(dates).toEqual(["2026-12-03T16:30:00.000Z", "2026-12-10T16:30:00.000Z", "2026-12-17T16:30:00.000Z"]);
  });

  it("finds the coming weekend from a weekday, and the rest of it from Saturday", () => {
    // Wednesday 2 Dec 2026, midday Kampala.
    const wed = new Date("2026-12-02T09:00:00Z");
    expect(kampalaWeekday(wed)).toBe(3);
    const w = kampalaUpcomingWeekend(wed);
    expect(iso(w.start)).toBe("2026-12-03T21:00:00.000Z"); // Fri 4 Dec 00:00
    expect(iso(w.end)).toBe("2026-12-06T21:00:00.000Z"); // Mon 7 Dec 00:00

    const sat = new Date("2026-12-05T09:00:00Z");
    const s = kampalaUpcomingWeekend(sat);
    expect(iso(s.start)).toBe("2026-12-05T21:00:00.000Z"); // Sun 6 Dec, tomorrow
    expect(iso(s.end)).toBe("2026-12-06T21:00:00.000Z");

    // Sunday looks ahead to next weekend rather than an empty range.
    const sun = new Date("2026-12-06T09:00:00Z");
    const n = kampalaUpcomingWeekend(sun);
    expect(iso(n.start)).toBe("2026-12-10T21:00:00.000Z"); // Fri 11 Dec
  });
});

describe("assembleTonight", () => {
  it("is never empty when only a journey exists", () => {
    const cards = assembleTonight({ today: [], perks: [], weekend: [], journey });
    expect(cards.map((c) => c.kind)).toEqual(["journey"]);
  });

  it("fills in order: today, perks (capped), weekend, then stops at the limit", () => {
    const cards = assembleTonight({
      today: [ev("a"), ev("b")],
      perks: [perk("1"), perk("2"), perk("3")],
      weekend: [ev("c"), ev("d"), ev("e")],
      journey,
    });
    expect(cards.map((c) => c.key)).toEqual(["today:a", "today:b", "perk:1", "perk:2", "weekend:c", "weekend:d"]);
    expect(cards.filter((c) => c.kind === "perk")).toHaveLength(TONIGHT_MAX_PERKS);
  });

  it("adds a journey only when the list is thin", () => {
    const thin = assembleTonight({ today: [ev("a")], perks: [], weekend: [], journey });
    expect(thin.map((c) => c.kind)).toEqual(["today", "journey"]);
    const full = assembleTonight({ today: [ev("a"), ev("b"), ev("c")], perks: [], weekend: [], journey });
    expect(full.some((c) => c.kind === "journey")).toBe(false);
  });

  it("never lists the same event twice", () => {
    const cards = assembleTonight({ today: [ev("a")], perks: [], weekend: [ev("a"), ev("b")], journey: null });
    expect(cards.map((c) => c.key)).toEqual(["today:a", "weekend:b"]);
  });
});
