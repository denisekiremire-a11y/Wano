import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "../src/db";
import {
  bookings,
  listings,
  pointsLedger,
  referralCredits,
  rewards,
  trailCompletions,
  trailListings,
  trails,
  travellerProfiles,
  userRewards,
  users,
  vendorProfiles,
} from "../src/db/schema";

// Real-DB integration tests — same reasoning as reward-redemption.test.ts
// and slot-booking.test.ts: these functions do several interdependent
// queries and writes (some inside withRlsContext), so a real Postgres
// connection is the only thing that proves the logic actually holds.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/notify", () => ({ notifyUser: vi.fn(), notifyAdmin: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));

import { tierForPoints } from "@/lib/data/points";
import { awardReferralCreditOnFirstBooking } from "@/lib/data/traveller";
import { checkAndAwardTrailCompletions } from "@/lib/data/trails";
import { issueCollabRewardsForBooking } from "@/lib/actions/reward-actions";
import { WELCOME_POINTS } from "@/lib/rewards-config";

function suffix() {
  return Math.random().toString(36).slice(2, 10);
}

function bookingRef() {
  return `TST-${suffix().toUpperCase()}`;
}

describe("tierForPoints", () => {
  it.each([
    [0, "explorer"],
    [999, "explorer"],
    [1000, "insider"],
    [4999, "insider"],
    [5000, "legend"],
    [999999, "legend"],
  ])("returns %i -> %s", (points, expected) => {
    expect(tierForPoints(points)).toBe(expected);
  });
});

describe("Wano additions — real-DB integration", () => {
  let vendorUserId: string;
  let vendorId: string;
  let listingAId: string;
  let listingBId: string;

  let referrerUserId: string;
  let referrerId: string;
  let refereeUserId: string;
  let refereeId: string;

  beforeAll(async () => {
    const [vendorUser] = await db
      .insert(users)
      .values({ email: `wano-add-v-${suffix()}@test.local`, passwordHash: "x", name: "Vendor", role: "vendor" })
      .returning();
    vendorUserId = vendorUser.id;
    const [vendor] = await db
      .insert(vendorProfiles)
      .values({ userId: vendorUserId, businessName: "Test Venue", location: "Kampala", description: "desc" })
      .returning();
    vendorId = vendor.id;
    const [listingA] = await db
      .insert(listings)
      .values({ vendorProfileId: vendorId, title: "Listing A", description: "desc" })
      .returning();
    listingAId = listingA.id;
    const [listingB] = await db
      .insert(listings)
      .values({ vendorProfileId: vendorId, title: "Listing B", description: "desc" })
      .returning();
    listingBId = listingB.id;

    const [referrerUser] = await db
      .insert(users)
      .values({ email: `wano-add-r-${suffix()}@test.local`, passwordHash: "x", name: "Referrer", role: "traveller" })
      .returning();
    referrerUserId = referrerUser.id;
    const [referrer] = await db
      .insert(travellerProfiles)
      .values({ userId: referrerUserId, displayName: "Referrer", referralCode: `WAR${suffix()}` })
      .returning();
    referrerId = referrer.id;

    const [refereeUser] = await db
      .insert(users)
      .values({
        email: `wano-add-e-${suffix()}@test.local`,
        passwordHash: "x",
        name: "Referee",
        role: "traveller",
        emailVerifiedAt: new Date(),
      })
      .returning();
    refereeUserId = refereeUser.id;
    const [referee] = await db
      .insert(travellerProfiles)
      .values({ userId: refereeUserId, displayName: "Referee", referralCode: `WAE${suffix()}` })
      .returning();
    refereeId = referee.id;
  });

  afterAll(async () => {
    await db.delete(pointsLedger).where(eq(pointsLedger.travellerId, referrerId));
    await db.delete(pointsLedger).where(eq(pointsLedger.travellerId, refereeId));
    await db.delete(referralCredits).where(eq(referralCredits.refereeId, refereeId));
    await db.delete(bookings).where(eq(bookings.travellerId, refereeId));
    await db.delete(trailCompletions).where(eq(trailCompletions.travellerId, refereeId));
    await db.delete(userRewards).where(eq(userRewards.travellerId, refereeId));
    await db.delete(rewards).where(eq(rewards.collabTriggerVendorProfileId, vendorId));
    await db.delete(trailListings).where(eq(trailListings.listingId, listingAId));
    await db.delete(trailListings).where(eq(trailListings.listingId, listingBId));
    await db.delete(trails).where(eq(trails.slug, `wano-add-test-${vendorId}`));
    await db.delete(listings).where(eq(listings.id, listingAId));
    await db.delete(listings).where(eq(listings.id, listingBId));
    await db.delete(vendorProfiles).where(eq(vendorProfiles.id, vendorId));
    await db.delete(travellerProfiles).where(eq(travellerProfiles.id, referrerId));
    await db.delete(travellerProfiles).where(eq(travellerProfiles.id, refereeId));
    await db.delete(users).where(eq(users.id, vendorUserId));
    await db.delete(users).where(eq(users.id, referrerUserId));
    await db.delete(users).where(eq(users.id, refereeUserId));
  });

  describe("awardReferralCreditOnFirstBooking — welcome points", () => {
    it("awards the referrer's bonus and the referee's welcome points exactly once, even called twice", async () => {
      await db.insert(referralCredits).values({ referrerId, refereeId });
      await db.insert(bookings).values({
        travellerId: refereeId,
        listingId: listingAId,
        status: "confirmed",
        bookingRef: bookingRef(),
      });

      await awardReferralCreditOnFirstBooking(refereeId);
      await awardReferralCreditOnFirstBooking(refereeId);

      const [credit] = await db.select().from(referralCredits).where(eq(referralCredits.refereeId, refereeId));
      expect(credit.status).toBe("awarded");

      const referrerRows = await db
        .select()
        .from(pointsLedger)
        .where(and(eq(pointsLedger.travellerId, referrerId), eq(pointsLedger.sourceType, "referral_credit")));
      expect(referrerRows).toHaveLength(1);
      expect(referrerRows[0].delta).toBe(credit.points);

      const welcomeRows = await db
        .select()
        .from(pointsLedger)
        .where(and(eq(pointsLedger.travellerId, refereeId), eq(pointsLedger.sourceType, "welcome_bonus")));
      expect(welcomeRows).toHaveLength(1);
      expect(welcomeRows[0].delta).toBe(WELCOME_POINTS);
    });
  });

  describe("checkAndAwardTrailCompletions", () => {
    it("only completes once every listing in the trail has a qualifying booking", async () => {
      const [trail] = await db
        .insert(trails)
        .values({ slug: `wano-add-test-${vendorId}`, name: "Test Trail", bonusXp: 200 })
        .returning();
      await db.insert(trailListings).values([
        { trailId: trail.id, listingId: listingAId },
        { trailId: trail.id, listingId: listingBId },
      ]);

      await db
        .insert(bookings)
        .values({ travellerId: refereeId, listingId: listingAId, status: "completed", bookingRef: bookingRef() });
      await checkAndAwardTrailCompletions(refereeId, listingAId);

      let completions = await db
        .select()
        .from(trailCompletions)
        .where(and(eq(trailCompletions.trailId, trail.id), eq(trailCompletions.travellerId, refereeId)));
      expect(completions).toHaveLength(0);

      await db
        .insert(bookings)
        .values({ travellerId: refereeId, listingId: listingBId, status: "completed", bookingRef: bookingRef() });
      await checkAndAwardTrailCompletions(refereeId, listingBId);

      completions = await db
        .select()
        .from(trailCompletions)
        .where(and(eq(trailCompletions.trailId, trail.id), eq(trailCompletions.travellerId, refereeId)));
      expect(completions).toHaveLength(1);

      // Idempotent — a second completed booking at the same listing (e.g.
      // re-running the cron) must not insert a duplicate row.
      await checkAndAwardTrailCompletions(refereeId, listingBId);
      completions = await db
        .select()
        .from(trailCompletions)
        .where(and(eq(trailCompletions.trailId, trail.id), eq(trailCompletions.travellerId, refereeId)));
      expect(completions).toHaveLength(1);
    });
  });

  describe("issueCollabRewardsForBooking — cap enforcement", () => {
    it("stops minting once totalCap is reached, across two different travellers", async () => {
      const [collabReward] = await db
        .insert(rewards)
        .values({
          title: "Collab test reward",
          targetType: "listing",
          targetId: listingBId,
          discountType: "freebie",
          source: "collab",
          collabTriggerVendorProfileId: vendorId,
          totalCap: 1,
          perUserCap: 1,
          status: "active",
          active: true,
        })
        .returning();

      await issueCollabRewardsForBooking(refereeId, vendorId);
      await issueCollabRewardsForBooking(referrerId, vendorId);

      const minted = await db.select().from(userRewards).where(eq(userRewards.rewardId, collabReward.id));
      expect(minted).toHaveLength(1);

      await db.delete(userRewards).where(eq(userRewards.rewardId, collabReward.id));
    });
  });
});
