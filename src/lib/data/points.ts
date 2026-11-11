import "server-only";
import { and, desc, eq, gte, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, pointsLedger, travellerInterests, travellerProfiles, users } from "@/db/schema";
import type { DbOrTx } from "@/lib/db-context";
import { withRlsContext } from "@/lib/db-context";
import { PAID_BOOKINGS_ENABLED } from "@/lib/feature-flags";

// 1 Wano Point = UGX 1 (business rule). Tiers are based on points *earned*
// in the trailing 12 months, not lifetime — a corrective reversing entry
// reduces the earned total for that window, same as it reduces balance.
// Canonical source for both constants — rewards-config.ts re-exports them
// rather than redefining, so there's exactly one literal of each.
export const POINT_VALUE_MINOR = 1;
export const TIER_THRESHOLDS = { explorer: 0, insider: 1000, legend: 5000 } as const;
export type Tier = "legend" | "insider" | "explorer";

// A one-time, permanent, lifetime-balance gate on spending Wano Points —
// distinct from Tier (a rolling trailing-12-months figure that can go back
// down) even though both currently read 1000. Once a traveller's balance
// has ever reached this, every point they hold (not just the surplus) can
// be spent or redeemed, forever, regardless of later balance drops.
export const POINTS_UNLOCK_THRESHOLD = 1000;

export function tierForPoints(earnedLast12Months: number): Tier {
  if (earnedLast12Months >= TIER_THRESHOLDS.legend) return "legend";
  if (earnedLast12Months >= TIER_THRESHOLDS.insider) return "insider";
  return "explorer";
}

export function twelveMonthsAgo() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d;
}

export async function getPointsBalance(travellerId: string): Promise<number> {
  const [row] = await db
    .select({ balance: sql<number>`coalesce(sum(${pointsLedger.delta}), 0)::int` })
    .from(pointsLedger)
    .where(eq(pointsLedger.travellerId, travellerId));
  return row?.balance ?? 0;
}

// Only positive deltas count — spending (a points-shop redemption, applying
// points to a booking) doesn't lower Tier standing, same as the old
// XP-side earned figure this is now merged with.
export async function getPointsEarnedLast12Months(travellerId: string): Promise<number> {
  const [row] = await db
    .select({ earned: sql<number>`coalesce(sum(${pointsLedger.delta}), 0)::int` })
    .from(pointsLedger)
    .where(
      and(
        eq(pointsLedger.travellerId, travellerId),
        gte(pointsLedger.createdAt, twelveMonthsAgo()),
        sql`${pointsLedger.delta} > 0`,
      ),
    );
  return row?.earned ?? 0;
}

/** The single way every Wano Points-earning (or -spending) action touches
 * the ledger. Additive alongside whatever row-insert the action already
 * does (a stamp, a review, …) — never a replacement for it. On an earning
 * entry (delta > 0), also permanently unlocks spending the first time the
 * traveller's balance reaches POINTS_UNLOCK_THRESHOLD. */
export async function awardPoints(
  params: { travellerId: string; delta: number; sourceType: string; sourceId?: string | null; reason: string },
  client: DbOrTx = db,
) {
  const { travellerId, delta, sourceType, sourceId, reason } = params;
  await client.insert(pointsLedger).values({ travellerId, delta, sourceType, sourceId: sourceId ?? null, reason });

  if (delta > 0) {
    const [row] = await client
      .select({ balance: sql<number>`coalesce(sum(${pointsLedger.delta}), 0)::int` })
      .from(pointsLedger)
      .where(eq(pointsLedger.travellerId, travellerId));
    if ((row?.balance ?? 0) >= POINTS_UNLOCK_THRESHOLD) {
      await client
        .update(travellerProfiles)
        .set({ pointsUnlockedAt: sql`coalesce(${travellerProfiles.pointsUnlockedAt}, now())` })
        .where(eq(travellerProfiles.id, travellerId));
    }
  }
}

// One-time bonus the first time persona + city + interests are all set.
// Defined here (not rewards-config.ts, its usual home) to avoid a circular
// import — maybeAwardProfileCompleteBonus below needs it and lives here
// too, since it's the one profile-completeness check in the codebase.
// rewards-config.ts re-exports it, same pattern as POINT_VALUE_MINOR.
export const PROFILE_COMPLETE_XP = 50;

/** Awards the one-time profile-complete bonus the moment persona, city, and
 * at least one interest are all set — called from the end of each of the
 * three onboarding steps (whichever happens to complete it last), guarded
 * by an existence check since there's no dedicated row to key off of. */
export async function maybeAwardProfileCompleteBonus(travellerId: string) {
  const [profile] = await db
    .select({ persona: travellerProfiles.persona, city: travellerProfiles.city })
    .from(travellerProfiles)
    .where(eq(travellerProfiles.id, travellerId))
    .limit(1);
  if (!profile?.persona || !profile.city) return;

  const [interest] = await db
    .select({ id: travellerInterests.id })
    .from(travellerInterests)
    .where(eq(travellerInterests.travellerId, travellerId))
    .limit(1);
  if (!interest) return;

  const [already] = await db
    .select({ id: pointsLedger.id })
    .from(pointsLedger)
    .where(and(eq(pointsLedger.travellerId, travellerId), eq(pointsLedger.sourceType, "profile_complete")))
    .limit(1);
  if (already) return;

  await awardPoints({
    travellerId,
    delta: PROFILE_COMPLETE_XP,
    sourceType: "profile_complete",
    reason: "Profile complete",
  });
}

export async function getPointsLedgerFor(travellerId: string, client = db) {
  return client
    .select()
    .from(pointsLedger)
    .where(eq(pointsLedger.travellerId, travellerId))
    .orderBy(desc(pointsLedger.createdAt));
}

export async function getPointsSummary(travellerId: string) {
  const [balance, earnedLast12Months, ledger] = await Promise.all([
    getPointsBalance(travellerId),
    getPointsEarnedLast12Months(travellerId),
    getPointsLedgerFor(travellerId),
  ]);
  return { balance, earnedLast12Months, tier: tierForPoints(earnedLast12Months), ledger };
}

export type SpendPointsResult =
  | { error: string }
  | { outcome: "applied"; pointsApplied: number; appliedMinor: number };

/** Applies points toward a booking's cost — Part B pilot only, and only
 * before the booking is confirmed (pointsAppliedMinor is set once, at
 * booking time, never adjusted after). Gated on phone verification
 * whenever the pilot flag is on: a simplification of the plan's
 * "referral/welcome points become spendable only once phone is
 * verified" — rather than tagging which of a traveller's ledger rows
 * came from referral/welcome (the ledger has no such split at balance
 * time), every point a traveller holds needs phone verification to
 * spend once the pilot is live. The vendor still gets paid totalMinor
 * in full outside this app (per the plan, Wano's reserve covers the
 * points-covered share) — this function only ever touches
 * pointsLedger/bookings, nothing payment-related. */
export async function spendPointsOnBooking(
  bookingId: string,
  travellerId: string,
  pointsToSpend: number,
): Promise<SpendPointsResult> {
  if (!PAID_BOOKINGS_ENABLED) return { error: "Points can't be applied to bookings right now." };
  if (!Number.isInteger(pointsToSpend) || pointsToSpend <= 0) return { error: "Enter a valid number of points." };

  const [booking] = await db
    .select({
      travellerId: bookings.travellerId,
      totalMinor: bookings.totalMinor,
      pointsAppliedMinor: bookings.pointsAppliedMinor,
      status: bookings.status,
      bookingRef: bookings.bookingRef,
    })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking || booking.travellerId !== travellerId) return { error: "Booking not found." };
  if (booking.status !== "held" && booking.status !== "pending") {
    return { error: "Points can only be applied before a booking is confirmed." };
  }
  if (booking.pointsAppliedMinor) return { error: "Points have already been applied to this booking." };
  if (!booking.totalMinor) return { error: "This booking has no price to apply points against." };

  const [traveller] = await db
    .select({ phoneVerifiedAt: travellerProfiles.phoneVerifiedAt, pointsUnlockedAt: travellerProfiles.pointsUnlockedAt })
    .from(travellerProfiles)
    .where(eq(travellerProfiles.id, travellerId))
    .limit(1);
  if (!traveller?.phoneVerifiedAt) return { error: "Verify your phone number to spend points." };
  if (!traveller.pointsUnlockedAt) {
    return { error: `Reach ${POINTS_UNLOCK_THRESHOLD.toLocaleString()} Wano Points to start spending.` };
  }

  const appliedMinor = pointsToSpend * POINT_VALUE_MINOR;
  if (appliedMinor > booking.totalMinor) return { error: "Can't apply more points than the booking total." };

  const balance = await getPointsBalance(travellerId);
  if (pointsToSpend > balance) return { error: "You don't have enough points." };

  const applied = await withRlsContext({ role: "admin" }, async (tx) => {
    const [updated] = await tx
      .update(bookings)
      .set({ pointsAppliedMinor: appliedMinor })
      .where(and(eq(bookings.id, bookingId), isNull(bookings.pointsAppliedMinor)))
      .returning({ id: bookings.id });
    if (!updated) return false;

    await tx.insert(pointsLedger).values({
      travellerId,
      delta: -pointsToSpend,
      reason: `Applied to booking ${booking.bookingRef}`,
      sourceType: "booking_spend",
      sourceId: bookingId,
    });
    return true;
  });
  if (!applied) return { error: "Points have already been applied to this booking." };

  return { outcome: "applied", pointsApplied: pointsToSpend, appliedMinor };
}

/** Admin traveller lookup by name, email, or referral code — small demo
 * dataset, so a plain ILIKE across all three is plenty; no need for a
 * dedicated search index. */
export async function searchTravellersForPoints(query: string) {
  const q = `%${query.trim()}%`;
  if (!query.trim()) return [];
  const rows = await db
    .select({ traveller: travellerProfiles, user: users })
    .from(travellerProfiles)
    .innerJoin(users, eq(travellerProfiles.userId, users.id))
    .where(or(ilike(users.name, q), ilike(users.email, q), ilike(travellerProfiles.referralCode, q)))
    .limit(20);
  return rows;
}

const adjustmentReasonMax = 500;

/** Records a manual points correction — always a new reversing/adding
 * entry, never an edit of a past one (append-only ledger, per business
 * rule). Reason is required so the ledger stays auditable. */
export async function addManualPointsAdjustment(
  actorUserId: string,
  travellerId: string,
  delta: number,
  reason: string,
) {
  const trimmedReason = reason.trim().slice(0, adjustmentReasonMax);
  return withRlsContext({ userId: actorUserId, role: "admin" }, (tx) =>
    tx
      .insert(pointsLedger)
      .values({
        travellerId,
        delta,
        reason: trimmedReason,
        sourceType: "manual_adjustment",
        createdByUserId: actorUserId,
      })
      .returning(),
  );
}
