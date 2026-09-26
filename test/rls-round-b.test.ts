import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../src/db";
import {
  bookingItems,
  bookingMessages,
  bookings,
  events,
  journeys,
  listings,
  rewards,
  stamps,
  travellerProfiles,
  userRewards,
  users,
  vendorProfiles,
} from "../src/db/schema";

// Same reasoning as test/rls-round-a.test.ts: a second, genuinely
// restricted (non-superuser, non-owner) connection is the only way to
// prove these policies hold on their own, independent of the app's own
// (superuser, locally) db client. Round B covers the tables whose
// ownership is reached via a join — bookings' vendor side (via listings/
// events), booking_items/booking_messages (via their parent booking), and
// user_rewards' vendor-redemption side (via the voucher's target).
const TEST_ROLE = "wano_rls_test";
const TEST_PASSWORD = "wano_rls_test";

let restricted: ReturnType<typeof postgres>;

let vendorAId: string;
let vendorBId: string;
let listingAId: string;
let eventId: string;
let travellerAUserId: string;
let travellerBUserId: string;
let travellerAId: string;
let travellerBId: string;
let listingBookingId: string;
let eventBookingId: string;
let bookingItemId: string;
let bookingMessageId: string;
let stampId: string;
let rewardId: string;
let userRewardId: string;

beforeAll(async () => {
  await db.execute(sql.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${TEST_ROLE}') THEN
        CREATE ROLE ${TEST_ROLE} LOGIN PASSWORD '${TEST_PASSWORD}' NOSUPERUSER NOBYPASSRLS;
      END IF;
    END
    $$;
  `));
  const dbName = new URL(process.env.DATABASE_URL!).pathname.slice(1);
  await db.execute(sql.raw(`GRANT CONNECT ON DATABASE ${dbName} TO ${TEST_ROLE};`));
  await db.execute(sql.raw(`GRANT USAGE ON SCHEMA public TO ${TEST_ROLE};`));
  await db.execute(sql.raw(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${TEST_ROLE};`));

  const url = new URL(process.env.DATABASE_URL!);
  restricted = postgres({
    host: url.hostname,
    port: Number(url.port || 5432),
    database: dbName,
    username: TEST_ROLE,
    password: TEST_PASSWORD,
  });

  const allVendors = await db.select().from(vendorProfiles).limit(2);
  vendorAId = allVendors[0].id;
  vendorBId = allVendors[1]?.id ?? allVendors[0].id;
  const [listingA] = await db.select().from(listings).where(eq(listings.vendorProfileId, vendorAId)).limit(1);
  listingAId = listingA.id;
  const [anEvent] = await db.select().from(events).limit(1);
  eventId = anEvent.id;

  // Two throwaway travellers, created directly (bypassing the app's own
  // signup flow, which isn't the thing under test here).
  const suffix = Math.random().toString(36).slice(2, 10);
  const [userA] = await db
    .insert(users)
    .values({ email: `rls-b-a-${suffix}@test.local`, passwordHash: "x", name: "RLS B Traveller A", role: "traveller" })
    .returning();
  const [userB] = await db
    .insert(users)
    .values({ email: `rls-b-b-${suffix}@test.local`, passwordHash: "x", name: "RLS B Traveller B", role: "traveller" })
    .returning();
  travellerAUserId = userA.id;
  travellerBUserId = userB.id;
  const [travellerA] = await db
    .insert(travellerProfiles)
    .values({ userId: userA.id, displayName: "RLS B Traveller A", referralCode: `RLSBA${suffix}` })
    .returning();
  const [travellerB] = await db
    .insert(travellerProfiles)
    .values({ userId: userB.id, displayName: "RLS B Traveller B", referralCode: `RLSBB${suffix}` })
    .returning();
  travellerAId = travellerA.id;
  travellerBId = travellerB.id;

  const [listingBooking] = await db
    .insert(bookings)
    .values({
      travellerId: travellerAId,
      listingId: listingAId,
      status: "confirmed",
      bookingRef: `RLSB-${suffix}-L`,
      estimatedCommission: "0",
    })
    .returning();
  listingBookingId = listingBooking.id;

  const [eventBooking] = await db
    .insert(bookings)
    .values({
      travellerId: travellerAId,
      eventId,
      status: "confirmed",
      bookingRef: `RLSB-${suffix}-E`,
      estimatedCommission: "0",
    })
    .returning();
  eventBookingId = eventBooking.id;

  const [item] = await db
    .insert(bookingItems)
    .values({ bookingId: listingBookingId, nameAtBooking: "Test item", quantity: 1 })
    .returning();
  bookingItemId = item.id;

  const [message] = await db
    .insert(bookingMessages)
    .values({ bookingId: listingBookingId, senderUserId: travellerAUserId, content: "Hello" })
    .returning();
  bookingMessageId = message.id;

  const [journey] = await db.select().from(journeys).limit(1);
  const [stamp] = await db
    .insert(stamps)
    .values({ travellerId: travellerAId, journeyId: journey.id, bookingId: listingBookingId })
    .returning();
  stampId = stamp.id;

  const [reward] = await db
    .insert(rewards)
    .values({
      title: `RLS B test reward ${suffix}`,
      targetType: "listing",
      targetId: listingAId,
      discountType: "percent",
      discountValue: "10",
      source: "manual",
    })
    .returning();
  rewardId = reward.id;

  const [userReward] = await db
    .insert(userRewards)
    .values({
      travellerId: travellerAId,
      rewardId,
      targetType: "listing",
      targetId: listingAId,
      redemptionCode: `RLSB-${suffix}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
    .returning();
  userRewardId = userReward.id;
});

afterAll(async () => {
  await restricted?.end();
  // Reverse-dependency cleanup — leaves the seeded/demo data exactly as
  // it was.
  await db.delete(userRewards).where(eq(userRewards.id, userRewardId));
  await db.delete(rewards).where(eq(rewards.id, rewardId));
  await db.delete(stamps).where(eq(stamps.id, stampId));
  await db.delete(bookingMessages).where(eq(bookingMessages.id, bookingMessageId));
  await db.delete(bookingItems).where(eq(bookingItems.id, bookingItemId));
  await db.delete(bookings).where(eq(bookings.id, eventBookingId));
  await db.delete(bookings).where(eq(bookings.id, listingBookingId));
  await db.delete(travellerProfiles).where(eq(travellerProfiles.id, travellerAId));
  await db.delete(travellerProfiles).where(eq(travellerProfiles.id, travellerBId));
  await db.delete(users).where(eq(users.id, travellerAUserId));
  await db.delete(users).where(eq(users.id, travellerBUserId));
});

describe("RLS Round B — indirect (join-based) ownership, zero application code involved", () => {
  describe("bookings", () => {
    it("lets anyone read an event booking with no context set (public attendee list stays open)", async () => {
      const rows = await restricted`select id from bookings where id = ${eventBookingId}`;
      expect(rows.length).toBe(1);
    });

    it("hides a listing booking entirely with no context set (no public path for these)", async () => {
      const rows = await restricted`select id from bookings where id = ${listingBookingId}`;
      expect(rows.length).toBe(0);
    });

    it("blocks traveller B from reading traveller A's listing booking", async () => {
      await restricted.begin(async (tx) => {
        await tx`select set_config('app.role', 'traveller', true), set_config('app.traveller_profile_id', ${travellerBId}, true)`;
        const rows = await tx`select id from bookings where id = ${listingBookingId}`;
        expect(rows.length).toBe(0);
      });
    });

    it("lets traveller A read their own listing booking", async () => {
      await restricted.begin(async (tx) => {
        await tx`select set_config('app.role', 'traveller', true), set_config('app.traveller_profile_id', ${travellerAId}, true)`;
        const rows = await tx`select id from bookings where id = ${listingBookingId}`;
        expect(rows.length).toBe(1);
      });
    });

    it("blocks vendor B (doesn't own the listing) from reading or updating the booking", async () => {
      await restricted.begin(async (tx) => {
        await tx`select set_config('app.role', 'vendor', true), set_config('app.vendor_profile_id', ${vendorBId}, true)`;
        const rows = await tx`select id from bookings where id = ${listingBookingId}`;
        expect(rows.length).toBe(0);
        const result = await tx`update bookings set status = 'cancelled' where id = ${listingBookingId}`;
        expect(result.count).toBe(0);
      });
    });

    it("lets vendor A (owns the listing) read and update the booking, via the listings join", async () => {
      await restricted.begin(async (tx) => {
        await tx`select set_config('app.role', 'vendor', true), set_config('app.vendor_profile_id', ${vendorAId}, true)`;
        const rows = await tx`select id from bookings where id = ${listingBookingId}`;
        expect(rows.length).toBe(1);
        const result = await tx`update bookings set status = status where id = ${listingBookingId}`;
        expect(result.count).toBe(1);
      });
    });

    it("rejects an insert attributed to a different traveller than the session's own", async () => {
      await expect(
        restricted.begin(async (tx) => {
          await tx`select set_config('app.role', 'traveller', true), set_config('app.traveller_profile_id', ${travellerAId}, true)`;
          await tx`insert into bookings (traveller_id, listing_id, status, booking_ref, estimated_commission)
                    values (${travellerBId}, ${listingAId}, 'pending', ${"RLSB-REJECT-" + Date.now()}, '0')`;
        }),
      ).rejects.toThrow();
    });
  });

  describe("booking_items and booking_messages (no owner column — mirror the parent booking)", () => {
    it("hides a booking's line items and messages from a vendor who doesn't own it", async () => {
      await restricted.begin(async (tx) => {
        await tx`select set_config('app.role', 'vendor', true), set_config('app.vendor_profile_id', ${vendorBId}, true)`;
        const items = await tx`select id from booking_items where id = ${bookingItemId}`;
        expect(items.length).toBe(0);
        const messages = await tx`select id from booking_messages where id = ${bookingMessageId}`;
        expect(messages.length).toBe(0);
      });
    });

    it("shows a booking's line items and messages to the traveller who made it and the vendor who owns it", async () => {
      await restricted.begin(async (tx) => {
        await tx`select set_config('app.role', 'traveller', true), set_config('app.traveller_profile_id', ${travellerAId}, true)`;
        const items = await tx`select id from booking_items where id = ${bookingItemId}`;
        expect(items.length).toBe(1);
        const messages = await tx`select id from booking_messages where id = ${bookingMessageId}`;
        expect(messages.length).toBe(1);
      });
      await restricted.begin(async (tx) => {
        await tx`select set_config('app.role', 'vendor', true), set_config('app.vendor_profile_id', ${vendorAId}, true)`;
        const items = await tx`select id from booking_items where id = ${bookingItemId}`;
        expect(items.length).toBe(1);
      });
    });
  });

  describe("stamps (system-minted only)", () => {
    it("blocks traveller B from reading traveller A's stamp, but lets traveller A read their own", async () => {
      await restricted.begin(async (tx) => {
        await tx`select set_config('app.role', 'traveller', true), set_config('app.traveller_profile_id', ${travellerBId}, true)`;
        const rows = await tx`select id from stamps where id = ${stampId}`;
        expect(rows.length).toBe(0);
      });
      await restricted.begin(async (tx) => {
        await tx`select set_config('app.role', 'traveller', true), set_config('app.traveller_profile_id', ${travellerAId}, true)`;
        const rows = await tx`select id from stamps where id = ${stampId}`;
        expect(rows.length).toBe(1);
      });
    });

    it("rejects a traveller inserting their own stamp directly — only admin-context writes are allowed", async () => {
      await expect(
        restricted.begin(async (tx) => {
          await tx`select set_config('app.role', 'traveller', true), set_config('app.traveller_profile_id', ${travellerAId}, true)`;
          const [{ id: journeyId }] = await tx`select id from journeys limit 1`;
          await tx`insert into stamps (traveller_id, journey_id, booking_id) values (${travellerAId}, ${journeyId}, ${listingBookingId})`;
        }),
      ).rejects.toThrow();
    });
  });

  describe("rewards (admin-managed catalog)", () => {
    it("hides the catalog entirely with no role context set", async () => {
      const rows = await restricted`select id from rewards where id = ${rewardId}`;
      expect(rows.length).toBe(0);
    });

    it("lets any authenticated role read the catalog (traveller here)", async () => {
      await restricted.begin(async (tx) => {
        await tx`select set_config('app.role', 'traveller', true)`;
        const rows = await tx`select id from rewards where id = ${rewardId}`;
        expect(rows.length).toBe(1);
      });
    });

    it("rejects a vendor writing to the catalog directly — admin only", async () => {
      await restricted.begin(async (tx) => {
        await tx`select set_config('app.role', 'vendor', true), set_config('app.vendor_profile_id', ${vendorAId}, true)`;
        const result = await tx`update rewards set active = false where id = ${rewardId}`;
        expect(result.count).toBe(0);
      });
    });
  });

  describe("user_rewards (traveller-owned; vendor may redeem their own venue's voucher)", () => {
    it("blocks traveller B from reading traveller A's voucher", async () => {
      await restricted.begin(async (tx) => {
        await tx`select set_config('app.role', 'traveller', true), set_config('app.traveller_profile_id', ${travellerBId}, true)`;
        const rows = await tx`select id from user_rewards where id = ${userRewardId}`;
        expect(rows.length).toBe(0);
      });
    });

    it("lets traveller A read their own voucher", async () => {
      await restricted.begin(async (tx) => {
        await tx`select set_config('app.role', 'traveller', true), set_config('app.traveller_profile_id', ${travellerAId}, true)`;
        const rows = await tx`select id from user_rewards where id = ${userRewardId}`;
        expect(rows.length).toBe(1);
      });
    });

    it("blocks vendor B (wrong venue) from reading or redeeming the voucher", async () => {
      await restricted.begin(async (tx) => {
        await tx`select set_config('app.role', 'vendor', true), set_config('app.vendor_profile_id', ${vendorBId}, true)`;
        const rows = await tx`select id from user_rewards where id = ${userRewardId}`;
        expect(rows.length).toBe(0);
        const result = await tx`update user_rewards set status = 'redeemed' where id = ${userRewardId}`;
        expect(result.count).toBe(0);
      });
    });

    it("lets vendor A (owns the voucher's target listing) read and redeem the voucher", async () => {
      await restricted.begin(async (tx) => {
        await tx`select set_config('app.role', 'vendor', true), set_config('app.vendor_profile_id', ${vendorAId}, true)`;
        const rows = await tx`select id from user_rewards where id = ${userRewardId}`;
        expect(rows.length).toBe(1);
        const result = await tx`update user_rewards set status = 'redeemed', redeemed_by_vendor_profile_id = ${vendorAId} where id = ${userRewardId}`;
        expect(result.count).toBe(1);
        // Leave it claimed again for any later test/run relying on this fixture.
        await tx`update user_rewards set status = 'claimed', redeemed_by_vendor_profile_id = null where id = ${userRewardId}`;
      });
    });
  });
});
