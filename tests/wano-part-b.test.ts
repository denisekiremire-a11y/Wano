import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "../src/db";
import { bookings, listings, pointsLedger, travellerProfiles, users, vendorProfiles } from "../src/db/schema";

// Real-DB integration tests for the Part B paid-bookings pilot — same
// reasoning as wano-additions.test.ts: these functions read/write across
// several tables (some inside withRlsContext), so only a real Postgres
// connection proves the logic actually holds. The pilot flag is forced on
// here since these are exactly the behaviors that stay fully inert with
// it off (already covered by tests/booking-actions.test.ts and
// tests/booking-shared.test.ts, which run with the real, flag-off env).
vi.mock("@/lib/feature-flags", () => ({ PAID_BOOKINGS_ENABLED: true }));

import { computeEstimatedCommission } from "@/lib/booking-shared";
import { POINT_VALUE_MINOR, getPointsBalance, spendPointsOnBooking } from "@/lib/data/points";
import { awardPointsForCompletedBooking } from "@/lib/points-on-booking";
import { COMMISSION_BY_LISTING_TYPE, EARN_RATE_BY_LISTING_TYPE } from "@/lib/rewards-config";

function suffix() {
  return Math.random().toString(36).slice(2, 10);
}

function bookingRef() {
  return `TSTB-${suffix().toUpperCase()}`;
}

describe("computeEstimatedCommission", () => {
  it("is always 0 when the paid pilot isn't active, regardless of listing type or total", () => {
    expect(computeEstimatedCommission("hotel", 500_000, false)).toBe("0");
    expect(computeEstimatedCommission("experience", 500_000, false)).toBe("0");
  });

  it("applies the listing type's commission rate only when the pilot is active", () => {
    expect(computeEstimatedCommission("hotel", 500_000, true)).toBe((500_000 * COMMISSION_BY_LISTING_TYPE.hotel).toFixed(2));
    expect(computeEstimatedCommission("event", 500_000, true)).toBe("0.00");
  });
});

describe("Part B — real-DB integration", () => {
  let vendorUserId: string;
  let vendorId: string;
  let hotelListingId: string;
  let travellerUserId: string;
  let travellerId: string;

  beforeAll(async () => {
    const [vendorUser] = await db
      .insert(users)
      .values({ email: `wano-b-v-${suffix()}@test.local`, passwordHash: "x", name: "Vendor", role: "vendor" })
      .returning();
    vendorUserId = vendorUser.id;
    const [vendor] = await db
      .insert(vendorProfiles)
      .values({ userId: vendorUserId, businessName: "Test Hotel", location: "Kampala", description: "desc", paidBookingsPilot: true })
      .returning();
    vendorId = vendor.id;
    const [hotelListing] = await db
      .insert(listings)
      .values({ vendorProfileId: vendorId, title: "Test Room", description: "desc", type: "hotel" })
      .returning();
    hotelListingId = hotelListing.id;

    const [travellerUser] = await db
      .insert(users)
      .values({ email: `wano-b-t-${suffix()}@test.local`, passwordHash: "x", name: "Traveller", role: "traveller" })
      .returning();
    travellerUserId = travellerUser.id;
    const [traveller] = await db
      .insert(travellerProfiles)
      .values({ userId: travellerUserId, displayName: "Traveller", referralCode: `WAB${suffix()}` })
      .returning();
    travellerId = traveller.id;
  });

  afterAll(async () => {
    await db.delete(pointsLedger).where(eq(pointsLedger.travellerId, travellerId));
    await db.delete(bookings).where(eq(bookings.travellerId, travellerId));
    await db.delete(listings).where(eq(listings.id, hotelListingId));
    await db.delete(vendorProfiles).where(eq(vendorProfiles.id, vendorId));
    await db.delete(travellerProfiles).where(eq(travellerProfiles.id, travellerId));
    await db.delete(users).where(eq(users.id, travellerUserId));
    await db.delete(users).where(eq(users.id, vendorUserId));
  });

  describe("awardPointsForCompletedBooking", () => {
    it("earns nothing for a pay-at-venue booking (estimatedCommission 0)", async () => {
      const [booking] = await db
        .insert(bookings)
        .values({
          travellerId,
          listingId: hotelListingId,
          status: "completed",
          bookingRef: bookingRef(),
          totalMinor: 100_000,
          estimatedCommission: "0",
        })
        .returning();

      await awardPointsForCompletedBooking(booking.id);

      const rows = await db
        .select()
        .from(pointsLedger)
        .where(and(eq(pointsLedger.sourceType, "booking"), eq(pointsLedger.sourceId, booking.id)));
      expect(rows).toHaveLength(0);
    });

    it("earns the listing type's rate on cash paid only, excluding whatever points covered", async () => {
      const totalMinor = 100_000;
      const pointsAppliedMinor = 40_000;
      const [booking] = await db
        .insert(bookings)
        .values({
          travellerId,
          listingId: hotelListingId,
          status: "completed",
          bookingRef: bookingRef(),
          totalMinor,
          pointsAppliedMinor,
          estimatedCommission: (totalMinor * COMMISSION_BY_LISTING_TYPE.hotel).toFixed(2),
        })
        .returning();

      await awardPointsForCompletedBooking(booking.id);

      const cashPaidMinor = totalMinor - pointsAppliedMinor;
      const expectedPoints = Math.floor((EARN_RATE_BY_LISTING_TYPE.hotel * cashPaidMinor) / POINT_VALUE_MINOR);

      const rows = await db
        .select()
        .from(pointsLedger)
        .where(and(eq(pointsLedger.sourceType, "booking"), eq(pointsLedger.sourceId, booking.id)));
      expect(rows).toHaveLength(1);
      expect(rows[0].delta).toBe(expectedPoints);

      // Idempotent — running again (e.g. the cron firing twice) must not
      // award a second time.
      await awardPointsForCompletedBooking(booking.id);
      const rowsAfterRetry = await db
        .select()
        .from(pointsLedger)
        .where(and(eq(pointsLedger.sourceType, "booking"), eq(pointsLedger.sourceId, booking.id)));
      expect(rowsAfterRetry).toHaveLength(1);
    });
  });

  describe("spendPointsOnBooking", () => {
    it("requires phone verification before spending", async () => {
      const [booking] = await db
        .insert(bookings)
        .values({ travellerId, listingId: hotelListingId, status: "held", bookingRef: bookingRef(), totalMinor: 100_000 })
        .returning();

      const result = await spendPointsOnBooking(booking.id, travellerId, 10);
      expect(result).toEqual({ error: "Verify your phone number to spend points." });
    });

    it("applies points once, updates the booking, and refuses a second application", async () => {
      await db.update(travellerProfiles).set({ phoneVerifiedAt: new Date() }).where(eq(travellerProfiles.id, travellerId));
      await db.insert(pointsLedger).values({
        travellerId,
        delta: 1000,
        reason: "Test seed",
        sourceType: "manual_adjustment",
      });

      const [booking] = await db
        .insert(bookings)
        .values({ travellerId, listingId: hotelListingId, status: "held", bookingRef: bookingRef(), totalMinor: 100_000 })
        .returning();

      const balanceBefore = await getPointsBalance(travellerId);
      const result = await spendPointsOnBooking(booking.id, travellerId, 200);
      expect(result).toEqual({ outcome: "applied", pointsApplied: 200, appliedMinor: 200 * POINT_VALUE_MINOR });

      const [updated] = await db.select().from(bookings).where(eq(bookings.id, booking.id));
      expect(updated.pointsAppliedMinor).toBe(200 * POINT_VALUE_MINOR);

      const balanceAfter = await getPointsBalance(travellerId);
      expect(balanceAfter).toBe(balanceBefore - 200);

      const again = await spendPointsOnBooking(booking.id, travellerId, 50);
      expect(again).toEqual({ error: "Points have already been applied to this booking." });
    });

    it("refuses to apply more points than the booking total", async () => {
      const [booking] = await db
        .insert(bookings)
        .values({ travellerId, listingId: hotelListingId, status: "held", bookingRef: bookingRef(), totalMinor: 1_000 })
        .returning();

      const result = await spendPointsOnBooking(booking.id, travellerId, 100);
      expect(result).toEqual({ error: "Can't apply more points than the booking total." });
    });
  });
});
