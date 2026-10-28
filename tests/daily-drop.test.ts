import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "../src/db";
import { dailyDrops, listings, rewards, travellerProfiles, userRewards, users, vendorProfiles } from "../src/db/schema";

// Real-DB tests for the Daily Drop: scheduling, claiming (identity, caps
// under a rush, no-show pause), redeeming only on the Drop day, and the XP
// it earns. Sessions are mocked; every DB write, lock and RLS check is real.
type FakeSession = { userId: string; role: "admin" | "traveller" | "vendor"; email: string };
const session = vi.hoisted(() => ({ current: { userId: "", role: "admin", email: "" } as FakeSession }));

vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn(async () => session.current),
  requireAdminPage: vi.fn(async () => ({ ...session.current, adminLevel: "super" })),
  requireAdminLevel: vi.fn(async () => ({ ...session.current, adminLevel: "super" })),
}));
// markRewardRedeemedAction (used below to redeem a Drop voucher) resolves
// the vendor via requireVendorAccess now, not requireRole directly — see
// the matching comment in tests/reward-redemption.test.ts.
vi.mock("@/lib/vendor-access", async () => {
  const { getVendorProfileByUserId } = await import("@/lib/data/vendor");
  return {
    requireVendorAccess: vi.fn(async () => {
      const vendorProfile = await getVendorProfileByUserId(session.current.userId);
      if (!vendorProfile) return null;
      return { vendorProfile, userId: session.current.userId, via: "login" as const };
    }),
  };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/notify", () => ({ notifyUser: vi.fn(), notifyAdmin: vi.fn() }));
vi.mock("@/lib/reward-notifications", () => ({ notifyRewardClaimed: vi.fn(), notifyRewardRedeemed: vi.fn() }));

import { claimDropAction, createDropAction } from "@/lib/actions/drop-actions";
import { markRewardRedeemedAction } from "@/lib/actions/reward-actions";
import { getXpEarnedLast12Months } from "@/lib/data/rewards";
import { kampalaDateIso } from "@/lib/drops";

const PIN = "4321";
const HOUR = 60 * 60 * 1000;
let adminUserId: string;
let vendorUserId: string;
let listingId: string;
let dateOffset = 30 + Math.floor(Math.random() * 300); // unique future dates per run

function suffix() {
  return Math.random().toString(36).slice(2, 10);
}

async function makeTraveller(verified = true) {
  const [user] = await db
    .insert(users)
    .values({
      email: `drop-t-${suffix()}@test.local`,
      passwordHash: "x",
      name: "Traveller",
      role: "traveller",
      emailVerifiedAt: verified ? new Date() : null,
    })
    .returning();
  const [profile] = await db
    .insert(travellerProfiles)
    .values({ userId: user.id, displayName: "Traveller", referralCode: `DROP${suffix().toUpperCase()}` })
    .returning();
  return { userId: user.id, travellerId: profile.id };
}

/** Schedules a Drop through the admin action, then moves its clock so it
 * is open to claim now (claims opened an hour ago). */
async function scheduleOpenDrop(cap = 20, opts: { live?: boolean } = {}) {
  session.current = { userId: adminUserId, role: "admin", email: "admin@test.local" };
  const dropDate = kampalaDateIso(new Date(), dateOffset++);
  const fd = new FormData();
  fd.set("dropDate", dropDate);
  fd.set("listingId", listingId);
  fd.set("title", "Free mocktail");
  fd.set("discountType", "freebie");
  fd.set("cap", String(cap));
  fd.set("redeemFrom", "17:00");
  fd.set("redeemUntil", "23:00");
  const res = await createDropAction({}, fd);
  expect(res.error).toBeUndefined();

  const [drop] = await db.select().from(dailyDrops).where(eq(dailyDrops.dropDate, dropDate));
  const now = Date.now();
  const claimsOpenAt = new Date(now - HOUR);
  const redeemFrom = opts.live ? new Date(now - HOUR / 2) : new Date(now + 20 * HOUR);
  const redeemUntil = new Date(redeemFrom.getTime() + 6 * HOUR);
  await db.update(dailyDrops).set({ claimsOpenAt, redeemFrom, redeemUntil }).where(eq(dailyDrops.id, drop.id));
  await db.update(rewards).set({ startsAt: claimsOpenAt, endsAt: redeemUntil }).where(eq(rewards.id, drop.rewardId));
  return { ...drop, claimsOpenAt, redeemFrom, redeemUntil };
}

function claimForm(dropId: string) {
  const fd = new FormData();
  fd.set("dropId", dropId);
  return fd;
}

async function claimAs(t: { userId: string }, dropId: string) {
  session.current = { userId: t.userId, role: "traveller", email: "t@test.local" };
  return claimDropAction({}, claimForm(dropId));
}

beforeAll(async () => {
  const [admin] = await db
    .insert(users)
    .values({ email: `drop-admin-${suffix()}@test.local`, passwordHash: "x", name: "Admin", role: "admin" })
    .returning();
  adminUserId = admin.id;
  const [vendorUser] = await db
    .insert(users)
    .values({ email: `drop-v-${suffix()}@test.local`, passwordHash: "x", name: "Vendor", role: "vendor" })
    .returning();
  vendorUserId = vendorUser.id;
  const [vendor] = await db
    .insert(vendorProfiles)
    .values({
      userId: vendorUserId,
      businessName: "Drop Cafe",
      location: "Bugolobi",
      description: "Test cafe",
      accreditationStatus: "trusted",
      staffPinHash: await bcrypt.hash(PIN, 10),
    })
    .returning();
  const [listing] = await db
    .insert(listings)
    .values({ vendorProfileId: vendor.id, title: "Drop Cafe", description: "desc", priceMinor: 10000 })
    .returning();
  listingId = listing.id;
});

describe("Daily Drop", () => {
  it("schedules a Drop as a capped, one-per-person 'drop' reward with its windows", async () => {
    const drop = await scheduleOpenDrop(20);
    const [reward] = await db.select().from(rewards).where(eq(rewards.id, drop.rewardId));
    expect(reward.source).toBe("drop");
    expect(reward.totalCap).toBe(20);
    expect(reward.perUserCap).toBe(1);
    expect(reward.fundedBy).toBe("vendor");
  });

  it("refuses a second Drop on the same date", async () => {
    const drop = await scheduleOpenDrop(5);
    const fd = new FormData();
    fd.set("dropDate", drop.dropDate);
    fd.set("listingId", listingId);
    fd.set("title", "Another perk");
    fd.set("discountType", "freebie");
    session.current = { userId: adminUserId, role: "admin", email: "a" };
    const res = await createDropAction({}, fd);
    expect(res.error).toMatch(/already a Drop/);
  });

  it("needs a verified account, then gives one voucher that expires when the window ends", async () => {
    const drop = await scheduleOpenDrop(20);
    const unverified = await makeTraveller(false);
    expect((await claimAs(unverified, drop.id)).error).toMatch(/Verify your email/);

    const t = await makeTraveller(true);
    expect((await claimAs(t, drop.id)).error).toBeUndefined();
    const [voucher] = await db.select().from(userRewards).where(eq(userRewards.travellerId, t.travellerId));
    expect(voucher.expiresAt.getTime()).toBe(drop.redeemUntil.getTime());

    expect((await claimAs(t, drop.id)).error).toMatch(/already claimed/);
  });

  it("never goes over the cap when many people claim at once", async () => {
    const drop = await scheduleOpenDrop(3);
    const people = await Promise.all(Array.from({ length: 8 }, () => makeTraveller(true)));
    // Each claim needs its own session, so call the action with the session
    // set per call; the mock reads session.current at call time.
    const results = await Promise.all(
      people.map(async (p) => {
        session.current = { userId: p.userId, role: "traveller", email: "t" };
        return claimDropAction({}, claimForm(drop.id));
      }),
    );
    const ok = results.filter((r) => !r.error);
    const issued = await db.select().from(userRewards).where(eq(userRewards.rewardId, drop.rewardId));
    expect(issued).toHaveLength(3);
    expect(ok.length).toBe(3);
    expect(results.filter((r) => r.error).every((r) => /gone|available/.test(r.error!))).toBe(true);
  });

  it("can't be used before the Drop day's window, can during it, and earns 50 XP", async () => {
    const drop = await scheduleOpenDrop(20);
    const t = await makeTraveller(true);
    await claimAs(t, drop.id);
    const [voucher] = await db.select().from(userRewards).where(eq(userRewards.rewardId, drop.rewardId));

    const redeem = () => {
      session.current = { userId: vendorUserId, role: "vendor", email: "v" };
      const fd = new FormData();
      fd.set("userRewardId", voucher.id);
      fd.set("pin", PIN);
      return markRewardRedeemedAction({}, fd);
    };
    expect((await redeem()).error).toMatch(/Daily Drop voucher can be used from/);

    const xpBefore = await getXpEarnedLast12Months(t.travellerId);
    await db.update(dailyDrops).set({ redeemFrom: new Date(Date.now() - HOUR) }).where(eq(dailyDrops.id, drop.id));
    expect((await redeem()).error).toBeUndefined();
    expect(await getXpEarnedLast12Months(t.travellerId)).toBe(xpBefore + 50);
  });

  it("pauses Drops for someone with three no-shows in 30 days", async () => {
    const t = await makeTraveller(true);
    for (let i = 0; i < 3; i++) {
      const old = await scheduleOpenDrop(20);
      await claimAs(t, old.id);
      // Their window closed without the voucher being used.
      await db
        .update(userRewards)
        .set({ expiresAt: new Date(Date.now() - (i + 1) * 24 * HOUR) })
        .where(eq(userRewards.rewardId, old.rewardId));
    }
    const drop = await scheduleOpenDrop(20);
    expect((await claimAs(t, drop.id)).error).toMatch(/paused/);
  });
});
