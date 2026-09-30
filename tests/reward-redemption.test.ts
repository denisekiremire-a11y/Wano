import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "../src/db";
import { listings, pointsLedger, rewards, travellerProfiles, userRewards, users, vendorProfiles } from "../src/db/schema";

// markRewardRedeemedAction is a "use server" action gated by requireRole —
// there's no real HTTP session in a test, so requireRole is mocked to
// return whichever vendor session the test sets. Everything else (the
// actual DB writes, the advisory lock, RLS) runs for real against the
// local dev Postgres — same reasoning as tests/slot-booking.test.ts: only
// a real concurrent transaction can prove a race is actually closed.
const session = vi.hoisted(() => ({ current: { userId: "", role: "vendor" as const, email: "" } }));

vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn(async () => session.current),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/notify", () => ({ notifyUser: vi.fn(), notifyAdmin: vi.fn() }));

import { markRewardRedeemedAction, mintUserReward } from "@/lib/actions/reward-actions";

const PIN = "1234";
let vendorAUserId: string;
let vendorAId: string;
let listingAId: string;
let vendorBUserId: string;
let vendorBId: string;
let listingBId: string;
let travellerId: string;

function suffix() {
  return Math.random().toString(36).slice(2, 10);
}

beforeAll(async () => {
  const [vendorAUser] = await db
    .insert(users)
    .values({ email: `redeem-a-${suffix()}@test.local`, passwordHash: "x", name: "Vendor A", role: "vendor" })
    .returning();
  vendorAUserId = vendorAUser.id;
  const [vendorA] = await db
    .insert(vendorProfiles)
    .values({
      userId: vendorAUserId,
      businessName: "Venue A",
      location: "Kampala",
      description: "Test venue A",
      staffPinHash: await bcrypt.hash(PIN, 10),
    })
    .returning();
  vendorAId = vendorA.id;
  const [listingA] = await db
    .insert(listings)
    .values({ vendorProfileId: vendorAId, title: "Venue A place", description: "desc" })
    .returning();
  listingAId = listingA.id;

  const [vendorBUser] = await db
    .insert(users)
    .values({ email: `redeem-b-${suffix()}@test.local`, passwordHash: "x", name: "Vendor B", role: "vendor" })
    .returning();
  vendorBUserId = vendorBUser.id;
  const [vendorB] = await db
    .insert(vendorProfiles)
    .values({
      userId: vendorBUserId,
      businessName: "Venue B",
      location: "Kampala",
      description: "Test venue B",
      staffPinHash: await bcrypt.hash(PIN, 10),
    })
    .returning();
  vendorBId = vendorB.id;
  const [listingB] = await db
    .insert(listings)
    .values({ vendorProfileId: vendorBId, title: "Venue B place", description: "desc" })
    .returning();
  listingBId = listingB.id;

  const [travellerUser] = await db
    .insert(users)
    .values({ email: `redeem-t-${suffix()}@test.local`, passwordHash: "x", name: "Traveller", role: "traveller" })
    .returning();
  const [traveller] = await db
    .insert(travellerProfiles)
    .values({ userId: travellerUser.id, displayName: "Traveller", referralCode: `RDM${suffix()}` })
    .returning();
  travellerId = traveller.id;
});

afterAll(async () => {
  await db.delete(pointsLedger).where(eq(pointsLedger.travellerId, travellerId));
  await db.delete(userRewards).where(eq(userRewards.travellerId, travellerId));
  await db.delete(rewards).where(eq(rewards.targetId, listingAId));
  await db.delete(rewards).where(eq(rewards.targetId, listingBId));
  await db.delete(listings).where(eq(listings.id, listingAId));
  await db.delete(listings).where(eq(listings.id, listingBId));
  await db.delete(vendorProfiles).where(eq(vendorProfiles.id, vendorAId));
  await db.delete(vendorProfiles).where(eq(vendorProfiles.id, vendorBId));
  await db.delete(travellerProfiles).where(eq(travellerProfiles.id, travellerId));
  await db.delete(users).where(eq(users.id, vendorAUserId));
  await db.delete(users).where(eq(users.id, vendorBUserId));
});

async function makeReward(overrides: Partial<typeof rewards.$inferInsert> = {}) {
  const [reward] = await db
    .insert(rewards)
    .values({
      title: "Test reward",
      targetType: "listing",
      targetId: listingAId,
      discountType: "fixed",
      discountValue: "10000",
      status: "active",
      active: true,
      ...overrides,
    })
    .returning();
  return reward;
}

async function makeVoucher(rewardId: string, overrides: Partial<typeof userRewards.$inferInsert> = {}) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const [voucher] = await db
    .insert(userRewards)
    .values({
      travellerId,
      rewardId,
      targetType: "listing",
      targetId: listingAId,
      redemptionCode: `WANO-${suffix().toUpperCase()}`,
      expiresAt,
      ...overrides,
    })
    .returning();
  return voucher;
}

function redeemForm(fields: { userRewardId: string; pin?: string; billAmountMinor?: string }) {
  const fd = new FormData();
  fd.set("userRewardId", fields.userRewardId);
  fd.set("pin", fields.pin ?? PIN);
  if (fields.billAmountMinor != null) fd.set("billAmountMinor", fields.billAmountMinor);
  return fd;
}

function asVendorA() {
  session.current = { userId: vendorAUserId, role: "vendor", email: "a@test.local" };
}
function asVendorB() {
  session.current = { userId: vendorBUserId, role: "vendor", email: "b@test.local" };
}

describe("markRewardRedeemedAction", () => {
  it("redeems a fixed-amount voucher and records the discount", async () => {
    asVendorA();
    const reward = await makeReward({ discountType: "fixed", discountValue: "10000" });
    const voucher = await makeVoucher(reward.id);

    const result = await markRewardRedeemedAction({}, redeemForm({ userRewardId: voucher.id }));
    expect(result.error).toBeUndefined();

    const [after] = await db.select().from(userRewards).where(eq(userRewards.id, voucher.id)).limit(1);
    expect(after.status).toBe("redeemed");
    expect(after.discountAmountMinor).toBe(10000);
    expect(after.redeemedByVendorProfileId).toBe(vendorAId);
  });

  it("never lets two concurrent redemptions both succeed (double redemption)", async () => {
    asVendorA();
    const reward = await makeReward({ discountType: "fixed", discountValue: "5000" });
    const voucher = await makeVoucher(reward.id);

    const [a, b] = await Promise.all([
      markRewardRedeemedAction({}, redeemForm({ userRewardId: voucher.id })),
      markRewardRedeemedAction({}, redeemForm({ userRewardId: voucher.id })),
    ]);
    const outcomes = [a, b];
    const succeeded = outcomes.filter((r) => !r.error);
    const failed = outcomes.filter((r) => r.error);
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0].error).toMatch(/already redeemed/i);

    const [after] = await db.select().from(userRewards).where(eq(userRewards.id, voucher.id)).limit(1);
    expect(after.status).toBe("redeemed");
  });

  it("rejects redemption at the wrong venue", async () => {
    const reward = await makeReward();
    const voucher = await makeVoucher(reward.id); // targets listing A

    asVendorB();
    const result = await markRewardRedeemedAction({}, redeemForm({ userRewardId: voucher.id }));
    expect(result.error).toMatch(/venue/i);

    const [after] = await db.select().from(userRewards).where(eq(userRewards.id, voucher.id)).limit(1);
    expect(after.status).toBe("claimed");
  });

  it("rejects an incorrect PIN", async () => {
    asVendorA();
    const reward = await makeReward();
    const voucher = await makeVoucher(reward.id);

    const result = await markRewardRedeemedAction({}, redeemForm({ userRewardId: voucher.id, pin: "0000" }));
    expect(result.error).toMatch(/incorrect pin/i);

    const [after] = await db.select().from(userRewards).where(eq(userRewards.id, voucher.id)).limit(1);
    expect(after.status).toBe("claimed");
  });

  it("rejects an expired voucher", async () => {
    asVendorA();
    const reward = await makeReward();
    const voucher = await makeVoucher(reward.id, { expiresAt: new Date(Date.now() - 60_000) });

    const result = await markRewardRedeemedAction({}, redeemForm({ userRewardId: voucher.id }));
    expect(result.error).toMatch(/expired/i);
  });

  it("rejects a bill below the spend-based perk's minimum", async () => {
    asVendorA();
    const reward = await makeReward({ discountType: "spend_perk", discountValue: "20", minBillMinor: 50_000 });
    const voucher = await makeVoucher(reward.id);

    const result = await markRewardRedeemedAction(
      {},
      redeemForm({ userRewardId: voucher.id, billAmountMinor: "10000" }),
    );
    expect(result.error).toMatch(/at least/i);

    const [after] = await db.select().from(userRewards).where(eq(userRewards.id, voucher.id)).limit(1);
    expect(after.status).toBe("claimed");
  });

  it("grants points instead of a monetary discount for a points-type voucher", async () => {
    asVendorA();
    const reward = await makeReward({ discountType: "points", discountValue: "150" });
    const voucher = await makeVoucher(reward.id);

    const result = await markRewardRedeemedAction({}, redeemForm({ userRewardId: voucher.id }));
    expect(result.error).toBeUndefined();

    const [after] = await db.select().from(userRewards).where(eq(userRewards.id, voucher.id)).limit(1);
    expect(after.discountAmountMinor).toBeNull();

    const ledgerRows = await db.select().from(pointsLedger).where(eq(pointsLedger.sourceId, voucher.id));
    expect(ledgerRows).toHaveLength(1);
    expect(ledgerRows[0].delta).toBe(150);
  });
});

describe("mintUserReward — caps enforced at issuance", () => {
  it("blocks a second claim once the per-traveller cap is reached", async () => {
    const reward = await makeReward({ perUserCap: 1 });
    await mintUserReward(travellerId, reward.id);
    await expect(mintUserReward(travellerId, reward.id)).rejects.toThrow(/maximum/i);
  });

  it("blocks issuance once the total cap is reached", async () => {
    const reward = await makeReward({ totalCap: 1, perUserCap: 5 });
    await mintUserReward(travellerId, reward.id);
    await expect(mintUserReward(travellerId, reward.id)).rejects.toThrow(/run out/i);
  });
});
