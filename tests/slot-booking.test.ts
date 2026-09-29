import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { bookings, listings, slots, travellerProfiles, vendorProfiles } from "@/db/schema";
import {
  cancelBooking,
  confirmBookingPayment,
  expirePendingRequests,
  releaseHeldBooking,
  reserveSlotHold,
  type ReserveSlotHoldInput,
} from "@/lib/slot-booking";

let vendorId: string;
let listingId: string;
let travellerId: string;

beforeAll(async () => {
  const [vendor] = await db.select().from(vendorProfiles).limit(1);
  const [listing] = await db.select().from(listings).where(eq(listings.vendorProfileId, vendor.id)).limit(1);
  const [traveller] = await db.select().from(travellerProfiles).limit(1);
  vendorId = vendor.id;
  listingId = listing.id;
  travellerId = traveller.id;
});

/** Creates a slot and, if alreadyBooked > 0, a real confirmed booking row
 * to account for it — recomputeSlotCapacity always derives bookedCount
 * from actual booking rows, never trusts a seeded counter value, so a
 * fixture has to match that or the "already booked" portion is silently
 * ignored (exactly the self-healing behavior slot-booking.ts is for). */
async function makeSlot(capacity: number, alreadyBooked = 0) {
  const date = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [slot] = await db
    .insert(slots)
    .values({ vendorId, listingId, date, startTime: "10:00", endTime: "12:00", capacity, bookedCount: alreadyBooked })
    .returning();
  if (alreadyBooked > 0) {
    await db.insert(bookings).values({
      travellerId,
      listingId,
      slotId: slot.id,
      bookingRef: `TESTFIXTURE${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      status: "confirmed",
      visitDate: date,
      visitTime: "10:00",
      partySize: alreadyBooked,
    });
  }
  return slot;
}

function holdInput(overrides: Partial<ReserveSlotHoldInput> & { slotId: string; partySize: number }): ReserveSlotHoldInput {
  return {
    travellerId,
    listingId,
    bookingName: null,
    notes: null,
    journeyId: null,
    appliedUserRewardId: null,
    subtotalMinor: null,
    totalMinor: null,
    lineItems: [],
    ...overrides,
  };
}

async function cleanupSlot(slotId: string) {
  await db.delete(bookings).where(eq(bookings.slotId, slotId));
  await db.delete(slots).where(eq(slots.id, slotId));
}

describe("reserveSlotHold — no double booking", () => {
  it("books the last spot successfully", async () => {
    const slot = await makeSlot(3, 2); // 1 spot left
    try {
      const result = await reserveSlotHold(holdInput({ slotId: slot.id, partySize: 1 }));
      expect("booking" in result).toBe(true);
      if (!("booking" in result)) throw new Error("expected booking");
      expect(result.booking.status).toBe("held");

      const [after] = await db.select().from(slots).where(eq(slots.id, slot.id)).limit(1);
      expect(after.bookedCount).toBe(3);

      const overflow = await reserveSlotHold(holdInput({ slotId: slot.id, partySize: 1 }));
      expect("error" in overflow).toBe(true);
    } finally {
      await cleanupSlot(slot.id);
    }
  });

  it("never lets two concurrent requests both take the last spot", async () => {
    const slot = await makeSlot(5, 4); // 1 spot left
    try {
      const [resultA, resultB] = await Promise.all([
        reserveSlotHold(holdInput({ slotId: slot.id, partySize: 1 })),
        reserveSlotHold(holdInput({ slotId: slot.id, partySize: 1 })),
      ]);

      const outcomes = [resultA, resultB];
      const successes = outcomes.filter((r) => "booking" in r);
      const failures = outcomes.filter((r) => "error" in r);
      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);

      const [after] = await db.select().from(slots).where(eq(slots.id, slot.id)).limit(1);
      expect(after.bookedCount).toBe(5);
    } finally {
      await cleanupSlot(slot.id);
    }
  });
});

describe("payment failure releases the hold", () => {
  it("keeps the booking held (capacity still reserved) when verification fails, then frees it on release", async () => {
    const slot = await makeSlot(2, 0);
    try {
      const held = await reserveSlotHold(holdInput({ slotId: slot.id, partySize: 2, totalMinor: 40000 }));
      if (!("booking" in held)) throw new Error("expected booking");

      const failingVerify = async () => ({
        txRef: held.booking.id,
        amount: 40000,
        currency: "UGX",
        status: "failed",
        id: "flw-tx-failed",
      });
      const result = await confirmBookingPayment(held.booking.id, "flw-tx-failed", failingVerify);
      expect(result.outcome).toBe("verification_failed");

      const [stillHeld] = await db.select().from(bookings).where(eq(bookings.id, held.booking.id)).limit(1);
      expect(stillHeld.status).toBe("held");
      const [slotStillHeld] = await db.select().from(slots).where(eq(slots.id, slot.id)).limit(1);
      expect(slotStillHeld.bookedCount).toBe(2);

      await releaseHeldBooking(held.booking.id);
      const [released] = await db.select().from(bookings).where(eq(bookings.id, held.booking.id)).limit(1);
      expect(released.status).toBe("expired");
      const [slotFreed] = await db.select().from(slots).where(eq(slots.id, slot.id)).limit(1);
      expect(slotFreed.bookedCount).toBe(0);
    } finally {
      await cleanupSlot(slot.id);
    }
  });

  it("confirms and returns capacity to the pool if payment succeeds after the hold already expired but the spot is still free", async () => {
    const slot = await makeSlot(2, 0);
    try {
      const held = await reserveSlotHold(holdInput({ slotId: slot.id, partySize: 1, totalMinor: 20000 }));
      if (!("booking" in held)) throw new Error("expected booking");
      await db.update(bookings).set({ heldUntil: new Date(Date.now() - 1000) }).where(eq(bookings.id, held.booking.id));

      const okVerify = async () => ({
        txRef: held.booking.id,
        amount: 20000,
        currency: "UGX",
        status: "successful",
        id: "flw-tx-ok",
      });
      const result = await confirmBookingPayment(held.booking.id, "flw-tx-ok", okVerify);
      expect(result.outcome).toBe("confirmed");

      const [confirmed] = await db.select().from(bookings).where(eq(bookings.id, held.booking.id)).limit(1);
      expect(confirmed.status).toBe("confirmed");
    } finally {
      await cleanupSlot(slot.id);
    }
  });
});

describe("request-mode expiry", () => {
  it("flips an unanswered request past its 2-hour window to expired", async () => {
    const [pending] = await db
      .insert(bookings)
      .values({
        travellerId,
        listingId,
        bookingRef: `TESTREQ${Date.now()}`,
        status: "pending",
        requestExpiresAt: new Date(Date.now() - 60 * 1000),
      })
      .returning();

    try {
      const expired = await expirePendingRequests();
      expect(expired.some((r) => r.bookingId === pending.id)).toBe(true);

      const [after] = await db.select().from(bookings).where(eq(bookings.id, pending.id)).limit(1);
      expect(after.status).toBe("expired");
    } finally {
      await db.delete(bookings).where(eq(bookings.id, pending.id));
    }
  });

  it("leaves a request untouched before its window closes", async () => {
    const [pending] = await db
      .insert(bookings)
      .values({
        travellerId,
        listingId,
        bookingRef: `TESTREQ${Date.now()}b`,
        status: "pending",
        requestExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      })
      .returning();

    try {
      const expired = await expirePendingRequests();
      expect(expired.some((r) => r.bookingId === pending.id)).toBe(false);

      const [after] = await db.select().from(bookings).where(eq(bookings.id, pending.id)).limit(1);
      expect(after.status).toBe("pending");
    } finally {
      await db.delete(bookings).where(eq(bookings.id, pending.id));
    }
  });
});

describe("cancellation returns capacity", () => {
  it("frees the slot when a confirmed booking is cancelled outside the 24h cutoff", async () => {
    const slot = await makeSlot(4, 0);
    const futureDate = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const [confirmed] = await db
      .insert(bookings)
      .values({
        travellerId,
        listingId,
        slotId: slot.id,
        bookingRef: `TESTCXL${Date.now()}`,
        status: "confirmed",
        visitDate: futureDate,
        visitTime: "10:00",
        partySize: 3,
        totalMinor: 60000,
      })
      .returning();

    try {
      const result = await cancelBooking(confirmed.id, travellerId);
      expect(result).toMatchObject({ outcome: "cancelled" });

      const [after] = await db.select().from(bookings).where(eq(bookings.id, confirmed.id)).limit(1);
      expect(after.status).toBe("cancelled");
      const [slotAfter] = await db.select().from(slots).where(eq(slots.id, slot.id)).limit(1);
      expect(slotAfter.bookedCount).toBe(0);
    } finally {
      await cleanupSlot(slot.id);
    }
  });

  it("refuses to cancel a confirmed booking inside the 24h cutoff and leaves its spot occupied", async () => {
    const slot = await makeSlot(2, 0);
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const isoDate = soon.toISOString().slice(0, 10);
    const [confirmed] = await db
      .insert(bookings)
      .values({
        travellerId,
        listingId,
        slotId: slot.id,
        bookingRef: `TESTCXL${Date.now()}b`,
        status: "confirmed",
        visitDate: isoDate,
        visitTime: `${String(soon.getHours()).padStart(2, "0")}:${String(soon.getMinutes()).padStart(2, "0")}`,
        partySize: 2, // takes the whole slot, so any leaked capacity is unmissable below
        totalMinor: 20000,
      })
      .returning();

    try {
      const result = await cancelBooking(confirmed.id, travellerId);
      expect("error" in result).toBe(true);

      const [after] = await db.select().from(bookings).where(eq(bookings.id, confirmed.id)).limit(1);
      expect(after.status).toBe("confirmed");

      // Proves capacity wasn't released, not just that the raw counter
      // didn't change: a fresh reservation attempt goes through the same
      // live recompute as the real booking flow.
      const attempt = await reserveSlotHold(holdInput({ slotId: slot.id, partySize: 1 }));
      expect("error" in attempt).toBe(true);
    } finally {
      await cleanupSlot(slot.id);
    }
  });
});

afterAll(async () => {
  await db.$client.end();
});
