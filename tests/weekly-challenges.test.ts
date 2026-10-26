import { describe, expect, it } from "vitest";
import { areaForLocation } from "@/lib/areas";
import { kampalaWeekBounds, kampalaWeekStartIso } from "@/lib/kampala-time";
import { challengeProgress, defaultChallengesForWeek, type CheckInFact } from "@/lib/weekly-challenges";

const visit = (vendorProfileId: string, area: string | null = null, listingTypes: string[] = []): CheckInFact => ({
  vendorProfileId,
  area,
  listingTypes,
});

describe("Kampala weeks", () => {
  it("starts the week on Monday in Kampala time", () => {
    // Sunday 13 Dec 2026, 22:30 UTC = Monday 14 Dec 01:30 in Kampala
    expect(kampalaWeekStartIso(new Date("2026-12-13T22:30:00Z"))).toBe("2026-12-14");
    // Sunday 13 Dec 2026, 20:00 UTC = Sunday 23:00 in Kampala
    expect(kampalaWeekStartIso(new Date("2026-12-13T20:00:00Z"))).toBe("2026-12-07");
  });

  it("gives Monday 00:00 to the next Monday 00:00, Kampala time", () => {
    const { start, end } = kampalaWeekBounds("2026-12-07");
    expect(start.toISOString()).toBe("2026-12-06T21:00:00.000Z");
    expect(end.toISOString()).toBe("2026-12-13T21:00:00.000Z");
  });
});

describe("neighbourhood from location text", () => {
  it("finds the area, preferring Kisementi over Kololo", () => {
    expect(areaForLocation("Kisementi, Kololo, Kampala")).toBe("Kisementi");
    expect(areaForLocation("Plot 4 Kololo Hill Drive")).toBe("Kololo");
    expect(areaForLocation("bugolobi")).toBe("Bugolobi");
    expect(areaForLocation("Muyenga")).toBeNull();
    expect(areaForLocation(null)).toBeNull();
  });
});

describe("weekly challenge set", () => {
  it("always has an easy, an explore and a theme challenge", () => {
    for (const week of ["2026-10-26", "2026-12-07", "2026-12-14", "2027-01-04"]) {
      expect(defaultChallengesForWeek(week).map((c) => c.slot)).toEqual(["easy", "explore", "theme"]);
    }
  });

  it("rotates the theme each week and repeats after five", () => {
    const themes = ["2026-12-07", "2026-12-14", "2026-12-21", "2026-12-28", "2027-01-04", "2027-01-11"].map(
      (w) => defaultChallengesForWeek(w)[2].title,
    );
    expect(new Set(themes.slice(0, 5)).size).toBe(5);
    expect(themes[5]).toBe(themes[0]);
  });
});

describe("challenge progress", () => {
  it("counts any visit for the easy challenge", () => {
    expect(challengeProgress({ kind: "visits", count: 1 }, [visit("a")], new Set())).toEqual({
      progress: 1,
      target: 1,
      done: true,
    });
    expect(challengeProgress({ kind: "visits", count: 1 }, [], new Set()).done).toBe(false);
  });

  it("only counts venues not visited before this week as new", () => {
    const rule = { kind: "new_venues", count: 2 } as const;
    expect(challengeProgress(rule, [visit("a"), visit("b")], new Set(["a"])).progress).toBe(1);
    expect(challengeProgress(rule, [visit("b"), visit("c")], new Set(["a"])).done).toBe(true);
  });

  it("counts distinct venues in the theme area or of the theme type", () => {
    expect(
      challengeProgress({ kind: "area", area: "Ntinda", count: 1 }, [visit("a", "Kololo")], new Set()).done,
    ).toBe(false);
    expect(challengeProgress({ kind: "area", area: "Ntinda", count: 1 }, [visit("a", "Ntinda")], new Set()).done).toBe(
      true,
    );
    const eat = { kind: "listing_type", listingType: "restaurant", count: 2 } as const;
    expect(challengeProgress(eat, [visit("a", null, ["restaurant"]), visit("a", null, ["restaurant"])], new Set()).done).toBe(
      false,
    );
    expect(
      challengeProgress(eat, [visit("a", null, ["restaurant"]), visit("b", null, ["spa_salon", "restaurant"])], new Set())
        .done,
    ).toBe(true);
  });
});
