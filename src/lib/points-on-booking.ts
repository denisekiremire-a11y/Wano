import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookingGuests, bookings, listings, pointsLedger } from "@/db/schema";
import { withRlsContext } from "@/lib/db-context";
import { awardPoints, POINT_VALUE_MINOR } from "@/lib/data/points";
import { BOOKING_COMPLETION_XP, EARN_RATE_BY_LISTING_TYPE } from "@/lib/rewards-config";

/** Awards Rewards points on a just-completed booking — Part B pilot
 * only. Gated on estimatedCommission > 0 rather than re-checking the
 * pilot flag/vendor opt-in here: that field is only ever nonzero for a
 * booking that genuinely went through the paid-pilot flow (see
 * computeEstimatedCommission in booking-shared.ts), so every
 * pay-at-venue booking — still all of them outside the pilot — is 0
 * and earns nothing, unchanged from before this pilot existed. Cash
 * paid excludes whatever points already covered
 * (bookings.pointsAppliedMinor) — the points-covered share never earns
 * more points. Idempotent via a sourceId=bookingId check, in case the
 * completion cron ever runs twice for the same booking. */
export async function awardPointsForCompletedBooking(bookingId: string): Promise<void> {
  const [booking] = await db
    .select({
      travellerId: bookings.travellerId,
      totalMinor: bookings.totalMinor,
      pointsAppliedMinor: bookings.pointsAppliedMinor,
      estimatedCommission: bookings.estimatedCommission,
      bookingRef: bookings.bookingRef,
      listingType: listings.type,
    })
    .from(bookings)
    .innerJoin(listings, eq(listings.id, bookings.listingId))
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking || !booking.totalMinor) return;
  if (Number(booking.estimatedCommission) <= 0) return;

  const cashPaidMinor = booking.totalMinor - (booking.pointsAppliedMinor ?? 0);
  if (cashPaidMinor <= 0) return;

  const earnRate = EARN_RATE_BY_LISTING_TYPE[booking.listingType];
  const pointsEarned = Math.floor((earnRate * cashPaidMinor) / POINT_VALUE_MINOR);
  if (pointsEarned <= 0) return;

  const [existing] = await db
    .select({ id: pointsLedger.id })
    .from(pointsLedger)
    .where(and(eq(pointsLedger.sourceType, "booking"), eq(pointsLedger.sourceId, bookingId)))
    .limit(1);
  if (existing) return;

  await withRlsContext({ role: "admin" }, (tx) =>
    tx.insert(pointsLedger).values({
      travellerId: booking.travellerId,
      delta: pointsEarned,
      reason: `Points earned on booking ${booking.bookingRef}`,
      sourceType: "booking",
      sourceId: bookingId,
    }),
  );
}

/** Booking-completion XP (the universal, always-on 100 XP) plus the same
 * amount to any group-booking guests — for whichever booking (listing or
 * event) just transitioned confirmed→completed. Separate sourceType from
 * this file's Part-B-pilot-only "booking" ledger entry above, which only
 * fires under the paid-bookings pilot and is valued differently. */
export async function awardCompletionXp(bookingId: string, travellerId: string) {
  await awardPoints({
    travellerId,
    delta: BOOKING_COMPLETION_XP,
    sourceType: "booking_completion_xp",
    sourceId: bookingId,
    reason: "Booking completed",
  });
  const guests = await db
    .select({ travellerId: bookingGuests.travellerId })
    .from(bookingGuests)
    .where(eq(bookingGuests.bookingId, bookingId));
  for (const guest of guests) {
    await awardPoints({
      travellerId: guest.travellerId,
      delta: BOOKING_COMPLETION_XP,
      sourceType: "group_outing",
      sourceId: bookingId,
      reason: "Group outing completed",
    });
  }
}
