import "server-only";
import { and, eq, gt, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookingItems, bookings, listings, slots } from "@/db/schema";
import { generateBookingRef } from "@/lib/booking-shared";
import { CANCELLATION_CUTOFF_HOURS, HOLD_MINUTES, REQUEST_EXPIRY_HOURS } from "@/lib/booking-config";
import type { Tx } from "@/lib/db-context";
import { refundFlutterwaveTransaction } from "@/lib/flutterwave";

// slots is RLS-protected (see drizzle/manual_rls_round_a.sql): writes need
// app.role='admin' or a matching app.vendor_profile_id set on the same
// transaction. Every function below is trusted booking-engine logic
// called on behalf of whoever's checking out (a traveller, most often) or
// by cron with no session at all — not "a vendor acting on their own
// slot" — so it always opens its transaction with admin-equivalent
// context rather than trying to attribute the write to whichever end
// user happened to trigger it. Ownership was already validated earlier in
// the request (a traveller can only reserve a slot that's really theirs
// to book); this is just how that already-checked write clears RLS.
function withSystemRls<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.role', 'admin', true)`);
    return fn(tx);
  });
}

// The capacity-safe core of the booking system — every function here is a
// plain async function, never "use server", never calling redirect()/
// revalidatePath(): callers (server actions, cron routes) own the Next.js-
// specific side effects (redirect, cache revalidation, notifications) and
// wrap these. That split is also what makes these directly integration-
// testable without fighting Next's request-context requirements.
//
// No double-booking: every read-then-write against a slot happens inside
// one db.transaction, serialized per-slot by pg_advisory_xact_lock(hashtext
// (slotId)) — the exact pattern createXpBookingAction already uses for its
// per-match seat cap. bookedCount is a real column (fast to read for
// display), but every reservation/release/expiry recomputes it from the
// actual held+confirmed rows under the lock and rewrites it — so it's
// self-healing against any drift, and a reservation attempt is correct
// even if a hold expired a second ago and the cron sweep hasn't run yet.

type Booking = typeof bookings.$inferSelect;

/** Recomputes and rewrites a slot's bookedCount from its real booking rows
 * (confirmed, plus held rows not yet past their hold) — must be called
 * from inside a transaction that already holds this slot's advisory lock.
 * excludeBookingId lets a caller ask "what would capacity be without this
 * one row" (used when re-evaluating a booking that's about to change). */
async function recomputeSlotCapacity(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  slotId: string,
  excludeBookingId?: string,
) {
  const now = new Date();
  const rows = await tx
    .select({ partySize: bookings.partySize })
    .from(bookings)
    .where(
      and(
        eq(bookings.slotId, slotId),
        excludeBookingId ? sql`${bookings.id} != ${excludeBookingId}` : sql`true`,
        or(eq(bookings.status, "confirmed"), and(eq(bookings.status, "held"), gt(bookings.heldUntil, now))),
      ),
    );
  const actual = rows.reduce((sum, r) => sum + (r.partySize ?? 1), 0);
  await tx.update(slots).set({ bookedCount: actual }).where(eq(slots.id, slotId));
  return actual;
}

export type ReserveSlotHoldInput = {
  travellerId: string;
  listingId: string;
  slotId: string;
  partySize: number;
  bookingName: string | null;
  notes: string | null;
  journeyId: string | null;
  appliedUserRewardId: string | null;
  subtotalMinor: number | null;
  totalMinor: number | null;
  lineItems: { itemId: string; name: string; priceMinor: number | null; quantity: number }[];
};

/** Step 1 of an instant-mode booking: reserves capacity for up to
 * HOLD_MINUTES while checkout runs. Returns an error if the slot is
 * blocked, belongs to a different listing, or doesn't have room —
 * capacity is always re-checked live under the slot's advisory lock, so
 * two travellers racing for the last spot can never both win. */
export async function reserveSlotHold(
  input: ReserveSlotHoldInput,
): Promise<{ error: string } | { booking: Booking }> {
  return withSystemRls(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.slotId}))`);

    const [slot] = await tx.select().from(slots).where(eq(slots.id, input.slotId)).limit(1);
    if (!slot || slot.listingId !== input.listingId) return { error: "This time slot isn't available." };
    if (slot.isBlocked) return { error: "This time isn't available." };
    const slotStart = new Date(`${slot.date}T${slot.startTime}`);
    if (slotStart <= new Date()) return { error: "This time has already passed." };

    const actuallyBooked = await recomputeSlotCapacity(tx, input.slotId);
    const remaining = slot.capacity - actuallyBooked;
    if (input.partySize > remaining) {
      return { error: remaining <= 0 ? "This slot is full." : `Only ${remaining} spot(s) left.` };
    }

    const heldUntil = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);
    const [booking] = await tx
      .insert(bookings)
      .values({
        travellerId: input.travellerId,
        listingId: input.listingId,
        slotId: input.slotId,
        journeyId: input.journeyId,
        visitDate: slot.date,
        visitTime: slot.startTime.slice(0, 5),
        partySize: input.partySize,
        bookingName: input.bookingName,
        notes: input.notes,
        appliedUserRewardId: input.appliedUserRewardId,
        status: "held",
        heldUntil,
        bookingRef: generateBookingRef(),
        estimatedCommission: "15.00",
        subtotalMinor: input.subtotalMinor,
        totalMinor: input.totalMinor,
      })
      .returning();

    if (input.lineItems.length > 0) {
      await tx.insert(bookingItems).values(
        input.lineItems.map((li) => ({
          bookingId: booking.id,
          listingItemId: li.itemId,
          nameAtBooking: li.name,
          priceMinorAtBooking: li.priceMinor,
          quantity: li.quantity,
        })),
      );
    }

    await recomputeSlotCapacity(tx, input.slotId);

    return { booking };
  });
}

/** Cancels a held booking outright — used for "no Flutterwave configured"
 * rollback and for a traveller abandoning checkout. No refund: a held
 * booking never had a confirmed payment (see confirmBookingPayment). */
export async function releaseHeldBooking(bookingId: string): Promise<void> {
  await withSystemRls(async (tx) => {
    const [updated] = await tx
      .update(bookings)
      .set({ status: "expired", heldUntil: null })
      .where(and(eq(bookings.id, bookingId), eq(bookings.status, "held")))
      .returning({ slotId: bookings.slotId });
    if (updated?.slotId) await recomputeSlotCapacity(tx, updated.slotId);
  });
}

/** Confirms a held booking immediately with no payment — the local-dev
 * fallback for when FLUTTERWAVE_SECRET_KEY isn't set, same reasoning as
 * createXpBookingAction's fallback. Capacity was already reserved at hold
 * time, so this is just a status flip. */
export async function confirmHeldBookingWithoutPayment(bookingId: string): Promise<Booking | null> {
  const [updated] = await db
    .update(bookings)
    .set({ status: "confirmed", heldUntil: null })
    .where(and(eq(bookings.id, bookingId), eq(bookings.status, "held")))
    .returning();
  return updated ?? null;
}

export type ConfirmPaymentResult =
  | { outcome: "confirmed"; booking: Booking }
  | { outcome: "already_confirmed" }
  | { outcome: "not_found" }
  | { outcome: "verification_failed" }
  | { outcome: "capacity_lost"; refunded: boolean };

/** Step 2: verifies a Flutterwave transaction and, if it genuinely paid
 * for this booking, confirms it — called from both the webhook (works
 * even if the traveller closes their browser) and the checkout redirect
 * page. Idempotent via UPDATE ... WHERE status = 'held', same pattern as
 * confirmXpPayment. Handles the rare case where payment succeeds after
 * the 10-minute hold already expired: re-attempts the reservation under
 * the slot's lock, and refunds automatically if the spot is genuinely
 * gone by then. */
export async function confirmBookingPayment(
  bookingId: string,
  transactionId: string,
  verify: (transactionId: string) => Promise<{ txRef: string; amount: number; currency: string; status: string; id: string }>,
): Promise<ConfirmPaymentResult> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) return { outcome: "not_found" };
  if (booking.status === "confirmed") return { outcome: "already_confirmed" };
  if (booking.status !== "held" && booking.status !== "expired") return { outcome: "not_found" };

  const verified = await verify(transactionId);
  const expectedAmount = booking.totalMinor ?? null;
  if (
    verified.txRef !== bookingId ||
    verified.currency !== "UGX" ||
    verified.status !== "successful" ||
    (expectedAmount !== null && verified.amount < expectedAmount)
  ) {
    return { outcome: "verification_failed" };
  }

  if (!booking.slotId) {
    const [updated] = await db
      .update(bookings)
      .set({ status: "confirmed", heldUntil: null, paymentRef: verified.id })
      .where(and(eq(bookings.id, bookingId), or(eq(bookings.status, "held"), eq(bookings.status, "expired"))))
      .returning();
    return updated ? { outcome: "confirmed", booking: updated } : { outcome: "already_confirmed" };
  }

  return withSystemRls(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${booking.slotId}))`);

    const [current] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!current || current.status === "confirmed") return { outcome: "already_confirmed" };

    const [slot] = await tx.select().from(slots).where(eq(slots.id, booking.slotId!)).limit(1);
    if (!slot) return { outcome: "capacity_lost", refunded: false };

    // Still within its hold, or was expired but the spot is still free —
    // either way, confirming needs room excluding this row's own (already
    // counted, if still held) reservation.
    const actuallyBookedWithoutThis = await recomputeSlotCapacity(tx, booking.slotId!, bookingId);
    const remaining = slot.capacity - actuallyBookedWithoutThis;
    if ((current.partySize ?? 1) > remaining) {
      const refunded = await refundFlutterwaveTransaction(verified.id, verified.amount);
      await tx
        .update(bookings)
        .set({ status: "expired", heldUntil: null })
        .where(eq(bookings.id, bookingId));
      return { outcome: "capacity_lost", refunded };
    }

    const [updated] = await tx
      .update(bookings)
      .set({ status: "confirmed", heldUntil: null, paymentRef: verified.id })
      .where(eq(bookings.id, bookingId))
      .returning();
    await recomputeSlotCapacity(tx, booking.slotId!);
    return { outcome: "confirmed", booking: updated };
  });
}

/** Cron sweep: flips any "held" booking past its 10-minute window to
 * "expired" and releases its slot capacity. Backstop only — reserveSlotHold
 * and confirmBookingPayment both already recompute capacity live and would
 * never let a genuinely-expired hold block anything, so this is purely
 * about not leaving stale "held" rows sitting in dashboards/history. */
export async function expireStaleHolds(): Promise<{ expiredBookingIds: string[] }> {
  const now = new Date();
  const stale = await db
    .select({ id: bookings.id, slotId: bookings.slotId })
    .from(bookings)
    .where(and(eq(bookings.status, "held"), lt(bookings.heldUntil, now)));

  const expiredBookingIds: string[] = [];
  for (const row of stale) {
    const resolved = await withSystemRls(async (tx) => {
      if (row.slotId) await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${row.slotId}))`);
      const [updated] = await tx
        .update(bookings)
        .set({ status: "expired", heldUntil: null })
        .where(and(eq(bookings.id, row.id), eq(bookings.status, "held")))
        .returning({ id: bookings.id });
      if (updated && row.slotId) await recomputeSlotCapacity(tx, row.slotId);
      return updated;
    });
    if (resolved) expiredBookingIds.push(row.id);
  }
  return { expiredBookingIds };
}

export type ExpiredRequest = { bookingId: string; travellerId: string; listingId: string | null };

/** Cron sweep: flips any request-mode "pending" booking past its 2-hour
 * response window to "expired" — no slot/capacity involved, request mode
 * never reserves a slot. Returns enough to let the caller notify the
 * traveller and suggest similar listings. */
export async function expirePendingRequests(): Promise<ExpiredRequest[]> {
  const now = new Date();
  const expired = await db
    .update(bookings)
    .set({ status: "expired" })
    .where(and(eq(bookings.status, "pending"), lt(bookings.requestExpiresAt, now)))
    .returning({ id: bookings.id, travellerId: bookings.travellerId, listingId: bookings.listingId });
  return expired.map((r) => ({ bookingId: r.id, travellerId: r.travellerId, listingId: r.listingId }));
}

/** Hours between now and a booking's visit date/time. Pulled out as its own
 * function (rather than inlined at each call site) so a Server Component
 * rendering a cancellation policy can call it without a bare `Date.now()`
 * appearing directly in its render body. */
export function hoursUntilVisit(visitDate: string, visitTime: string | null): number {
  const slotStart = new Date(`${visitDate}T${visitTime ?? "00:00"}`);
  return (slotStart.getTime() - Date.now()) / (60 * 60 * 1000);
}

export type CancelOutcome = { error: string } | { outcome: "cancelled"; refunded: boolean };

/** Traveller-initiated cancellation. held/pending: free, no refund (no
 * payment was ever confirmed). confirmed: free + refunded up to
 * CANCELLATION_CUTOFF_HOURS before the slot/visit; blocked after that —
 * the UI shows this policy before checkout so it's never a surprise. */
export async function cancelBooking(bookingId: string, travellerId: string): Promise<CancelOutcome> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking || booking.travellerId !== travellerId) return { error: "Booking not found." };

  if (booking.status === "held" || booking.status === "pending") {
    await withSystemRls(async (tx) => {
      await tx
        .update(bookings)
        .set({ status: "cancelled", heldUntil: null, requestExpiresAt: null })
        .where(eq(bookings.id, bookingId));
      if (booking.slotId) {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${booking.slotId}))`);
        await recomputeSlotCapacity(tx, booking.slotId);
      }
    });
    return { outcome: "cancelled", refunded: false };
  }

  if (booking.status !== "confirmed") return { error: "This booking can't be cancelled." };

  if (!booking.visitDate) return { error: "This booking can't be cancelled." };
  const hoursUntil = hoursUntilVisit(booking.visitDate, booking.visitTime);
  if (hoursUntil < CANCELLATION_CUTOFF_HOURS) {
    return { error: `Too close to your slot to cancel — free cancellation closes ${CANCELLATION_CUTOFF_HOURS}h before.` };
  }

  let refunded = false;
  if (booking.paymentRef && booking.totalMinor) {
    refunded = await refundFlutterwaveTransaction(booking.paymentRef, booking.totalMinor);
  }

  await withSystemRls(async (tx) => {
    await tx.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, bookingId));
    if (booking.slotId) {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${booking.slotId}))`);
      await recomputeSlotCapacity(tx, booking.slotId);
    }
  });

  return { outcome: "cancelled", refunded };
}

/** Vendor-initiated cancellation of an already-confirmed booking — unlike
 * a traveller cancelling their own booking, this always refunds (the
 * traveller didn't cause it), always flags the booking for Wano support to
 * look at, and counts against the vendor's cancellation record. Ownership
 * (this vendor really owns the listing/event behind this booking) is the
 * caller's job — same "requireRole + ownership check" pattern as every
 * other vendor action, not DB-level RLS (see slot-actions.ts for why). */
export async function vendorCancelConfirmedBooking(bookingId: string): Promise<CancelOutcome> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  if (!booking) return { error: "Booking not found." };
  if (booking.status !== "confirmed") return { error: "This booking isn't confirmed." };

  let refunded = false;
  if (booking.paymentRef && booking.totalMinor) {
    refunded = await refundFlutterwaveTransaction(booking.paymentRef, booking.totalMinor);
  }

  await withSystemRls(async (tx) => {
    await tx.update(bookings).set({ status: "cancelled", flaggedForSupport: true }).where(eq(bookings.id, bookingId));
    if (booking.slotId) {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${booking.slotId}))`);
      await recomputeSlotCapacity(tx, booking.slotId);
    }
    if (booking.listingId) {
      const [listing] = await tx.select({ vendorProfileId: listings.vendorProfileId }).from(listings).where(eq(listings.id, booking.listingId)).limit(1);
      if (listing) {
        await tx.execute(
          sql`update vendor_profiles set vendor_cancellation_count = vendor_cancellation_count + 1 where id = ${listing.vendorProfileId}`,
        );
      }
    }
  });

  return { outcome: "cancelled", refunded };
}

export const bookingConfig = { HOLD_MINUTES, REQUEST_EXPIRY_HOURS, CANCELLATION_CUTOFF_HOURS };
