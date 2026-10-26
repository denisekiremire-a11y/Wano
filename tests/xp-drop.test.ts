import { describe, expect, it } from "vitest";
import { db } from "../src/db";
import { dailyDrops, listings, rewards, travellerProfiles, users, vendorProfiles } from "../src/db/schema";
import { countXpDropDays, recordCheckIn } from "@/lib/data/check-ins";
import { getFundedDropDates, getHomeXpDrops } from "@/lib/data/drops";
import { isDropAnnounced, xpDropArea } from "@/lib/drops";
import { LAUNCH_AREAS } from "@/lib/areas";

// XP Drop: on days without a funded Daily Drop, a verified visit in that
// day's neighbourhood earns XP once.
function suffix() {
  return Math.random().toString(36).slice(2, 10);
}
async function makeTraveller() {
  const [user] = await db
    .insert(users)
    .values({ email: `xd-${suffix()}@test.local`, passwordHash: "x", name: "T", role: "traveller" })
    .returning();
  const [t] = await db
    .insert(travellerProfiles)
    .values({ userId: user.id, displayName: "T", referralCode: `XD${suffix().toUpperCase()}` })
    .returning();
  return t.id;
}
async function makeVenue(location: string) {
  const [user] = await db
    .insert(users)
    .values({ email: `xd-v-${suffix()}@test.local`, passwordHash: "x", name: "V", role: "vendor" })
    .returning();
  const [vendor] = await db
    .insert(vendorProfiles)
    .values({ userId: user.id, businessName: `XD Venue ${suffix()}`, location, description: "x", accreditationStatus: "trusted" })
    .returning();
  return vendor.id;
}
/** A random far-future Kampala date, so tests don't collide on the one-Drop-per-day rule. */
function farDate() {
  const day = 25_000 + Math.floor(Math.random() * 20_000);
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}
async function fundDrop(date: string, vendorProfileId: string) {
  const [listing] = await db
    .insert(listings)
    .values({ vendorProfileId, title: "Spot", description: "x", type: "experience", priceMinor: 1000, active: true, isPublished: true })
    .returning();
  const [reward] = await db
    .insert(rewards)
    .values({ title: "Perk", targetType: "listing", targetId: listing.id, discountType: "freebie", source: "drop", fundedBy: "vendor", totalCap: 20, perUserCap: 1 })
    .returning();
  const at = new Date(`${date}T14:00:00Z`);
  await db.insert(dailyDrops).values({ dropDate: date, rewardId: reward.id, claimsOpenAt: at, redeemFrom: at, redeemUntil: at });
}

describe("XP Drop rules", () => {
  it("rotates through the four launch areas, one per day", () => {
    const days = ["2026-12-14", "2026-12-15", "2026-12-16", "2026-12-17", "2026-12-18"].map(xpDropArea);
    expect(new Set(days.slice(0, 4))).toEqual(new Set(LAUNCH_AREAS));
    expect(days[4]).toBe(days[0]);
  });

  it("announces tomorrow's at 5 pm Kampala time", () => {
    expect(isDropAnnounced(new Date("2026-12-14T13:59:00Z"))).toBe(false); // 16:59
    expect(isDropAnnounced(new Date("2026-12-14T14:00:00Z"))).toBe(true); // 17:00
  });
});

describe("XP Drop", () => {
  it("pays once per day for a visit in the day's area, and not on funded Drop days", async () => {
    const date = farDate();
    const area = xpDropArea(date);
    const other = LAUNCH_AREAS.find((a) => a !== area)!;
    const [t, here, here2, elsewhere] = await Promise.all([
      makeTraveller(),
      makeVenue(`${area}, Kampala`),
      makeVenue(`${area}, Kampala`),
      makeVenue(`${other}, Kampala`),
    ]);
    const noon = new Date(`${date}T09:00:00Z`);

    const first = await recordCheckIn(t, here, "qr", noon);
    expect(first.completed).toContainEqual({ title: `XP Drop in ${area}`, xp: 100 });
    const second = await recordCheckIn(t, here2, "qr", new Date(noon.getTime() + 3_600_000));
    expect(second.completed.some((c) => c.title.startsWith("XP Drop"))).toBe(false);
    await recordCheckIn(t, elsewhere, "qr", noon);
    expect(await countXpDropDays(t)).toBe(1);

    // A funded Drop that day replaces the XP Drop.
    await fundDrop(date, elsewhere);
    expect((await getFundedDropDates([date])).has(date)).toBe(true);
    expect(await countXpDropDays(t)).toBe(0);
    expect((await getHomeXpDrops(noon)).today).toBeNull();
  });

  it("shows today's XP Drop with partners in the area", async () => {
    const date = farDate();
    const area = xpDropArea(date);
    await makeVenue(`${area}, Kampala`);
    const view = await getHomeXpDrops(new Date(`${date}T09:00:00Z`));
    expect(view.today).toMatchObject({ date, area, xp: 100 });
    expect(view.today!.venues.length).toBeGreaterThan(0);
    expect(view.tomorrow).toBeNull(); // not announced before 5 pm
  });
});
