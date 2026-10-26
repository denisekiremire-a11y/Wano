import { describe, expect, it } from "vitest";
import { computeStreak } from "@/lib/streaks";

// Mondays from 7 Dec 2026.
const W = ["2026-12-07", "2026-12-14", "2026-12-21", "2026-12-28", "2027-01-04", "2027-01-11", "2027-01-18", "2027-01-25"];

describe("weekly streaks", () => {
  it("counts consecutive weeks with a visit", () => {
    expect(computeStreak([W[0], W[1], W[2]], W[2])).toMatchObject({ current: 3, best: 3, thisWeekDone: true });
  });

  it("does not break during the week in progress", () => {
    expect(computeStreak([W[0], W[1]], W[2])).toMatchObject({ current: 2, thisWeekDone: false });
  });

  it("forgives one missed week a month", () => {
    // Missed 14 Dec, the December skip.
    const s = computeStreak([W[0], W[2], W[3]], W[3]);
    expect(s.current).toBe(3);
    expect(s.skipAvailable).toBe(false);
  });

  it("breaks on a second miss in the same month", () => {
    // Missed 14 Dec and 28 Dec.
    const s = computeStreak([W[0], W[2], W[4]], W[4]);
    expect(s.current).toBe(1);
    expect(s.best).toBe(2);
  });

  it("gives a fresh skip each month", () => {
    // Missed 14 Dec (December skip) and 11 Jan (January skip).
    const s = computeStreak([W[0], W[2], W[3], W[4], W[6]], W[6]);
    expect(s.current).toBe(5);
  });

  it("pays the 4-week milestone once per run", () => {
    const s = computeStreak(W.slice(0, 6), W[5]);
    expect(s.milestones).toEqual([{ weeks: 4, xp: 300, weekStart: W[3] }]);
  });

  it("is empty for a member with no visits", () => {
    expect(computeStreak([], W[0])).toEqual({ current: 0, best: 0, skipAvailable: true, thisWeekDone: false, milestones: [] });
  });
});
