import { describe, expect, it } from "vitest";
import { dropPausedUntil, dropPhase, dropWindows, kampalaDateIso } from "@/lib/drops";

const iso = (d: Date) => d.toISOString();
const DAY = 24 * 60 * 60 * 1000;

describe("Daily Drop timing", () => {
  it("opens claims at 17:00 Kampala the day before", () => {
    const w = dropWindows("2026-12-04", "17:00", "23:00");
    expect(iso(w.claimsOpenAt)).toBe("2026-12-03T14:00:00.000Z");
    expect(iso(w.redeemFrom)).toBe("2026-12-04T14:00:00.000Z");
    expect(iso(w.redeemUntil)).toBe("2026-12-04T20:00:00.000Z");
  });

  it("runs a redeem window past midnight when it ends earlier than it starts", () => {
    const w = dropWindows("2026-12-04", "20:00", "01:00");
    expect(iso(w.redeemUntil)).toBe("2026-12-04T22:00:00.000Z"); // 01:00 on 5 Dec Kampala
  });

  it("moves through its phases", () => {
    const w = dropWindows("2026-12-04", "17:00", "23:00");
    expect(dropPhase(w, new Date("2026-12-03T13:59:00Z"))).toBe("announced_soon");
    expect(dropPhase(w, new Date("2026-12-03T14:00:00Z"))).toBe("claimable");
    expect(dropPhase(w, new Date("2026-12-04T15:00:00Z"))).toBe("live");
    expect(dropPhase(w, new Date("2026-12-04T20:00:00Z"))).toBe("over");
  });

  it("gives Kampala dates, not UTC ones", () => {
    expect(kampalaDateIso(new Date("2026-12-03T22:30:00Z"))).toBe("2026-12-04");
    expect(kampalaDateIso(new Date("2026-12-03T10:00:00Z"), 1)).toBe("2026-12-04");
  });
});

describe("Drop no-show pause", () => {
  const now = new Date("2026-12-20T12:00:00Z");
  const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);

  it("does not pause for two no-shows", () => {
    expect(dropPausedUntil([daysAgo(1), daysAgo(5)], now)).toBeNull();
  });

  it("pauses for 14 days from the third no-show inside 30 days", () => {
    const until = dropPausedUntil([daysAgo(20), daysAgo(10), daysAgo(2)], now);
    expect(until && iso(until)).toBe(iso(new Date(daysAgo(2).getTime() + 14 * DAY)));
  });

  it("ignores no-shows older than 30 days, and ends after 14 days", () => {
    expect(dropPausedUntil([daysAgo(40), daysAgo(10), daysAgo(2)], now)).toBeNull();
    expect(dropPausedUntil([daysAgo(29), daysAgo(25), daysAgo(15)], now)).toBeNull();
  });
});
