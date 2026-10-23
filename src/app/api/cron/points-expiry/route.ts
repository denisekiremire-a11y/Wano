import { NextResponse } from "next/server";
import { rejectUnauthorizedCron } from "@/lib/cron-auth";
import { eq, sql } from "drizzle-orm";
import { bookings, pointsLedger, travellerProfiles, users } from "@/db/schema";
import { withRlsContext } from "@/lib/db-context";
import { notifyUser } from "@/lib/notify";

const EXPIRY_DAYS = 365;
const REMINDER_DAYS_BEFORE = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Zeroes out a Rewards points balance (a new reversing entry, never an
 * edit/delete — same append-only rule as every other pointsLedger write)
 * for any traveller with no booking and no ledger activity in the last
 * 12 months, and emails whoever is about to hit that mark 30 days out.
 * Both this and Part A's referral/welcome points go through the same
 * ledger, so this runs unconditionally — it isn't gated on the Part B
 * pilot flag, which only controls *earning* points on paid bookings.
 *
 * "Activity" is the later of a traveller's most recent booking or most
 * recent ledger entry (earn or spend) — fetched as two small grouped
 * queries and merged in JS, same style as getDashboardMetrics (dataset
 * is small enough that SQL aggregation across both tables buys nothing).
 *
 * Reminder/expiry are both date-window checks against "now" on this
 * daily cron, not a stored "reminder sent" flag — a traveller who's
 * exactly 30 days from expiry today gets exactly one reminder; if a run
 * is ever missed, that traveller's reminder is simply missed too (same
 * "kept simple on purpose, no retry path" judgment call used for the
 * referral payout in awardReferralCreditOnFirstBooking). Expiry itself
 * doesn't need a window — it's naturally idempotent, since a traveller
 * already zeroed out has balance 0 and stops matching next run.
 *
 * Wired to Vercel Cron via vercel.json, same auth pattern as every
 * other cron here.
 */
export async function GET(request: Request) {
  const rejected = rejectUnauthorizedCron(request);
  if (rejected) return rejected;

  const now = Date.now();
  const expiryCutoff = new Date(now - EXPIRY_DAYS * DAY_MS);
  // A traveller reminded today will hit EXPIRY_DAYS of inactivity in
  // exactly REMINDER_DAYS_BEFORE days — i.e. their last activity was
  // (EXPIRY_DAYS - REMINDER_DAYS_BEFORE) days ago. One day wide, to match
  // this cron's own daily cadence.
  const reminderWindowStart = new Date(now - (EXPIRY_DAYS - REMINDER_DAYS_BEFORE + 1) * DAY_MS);
  const reminderWindowEnd = new Date(now - (EXPIRY_DAYS - REMINDER_DAYS_BEFORE) * DAY_MS);

  const { ledgerAgg, bookingAgg } = await withRlsContext({ role: "admin" }, async (tx) => {
    const ledgerAgg = await tx
      .select({
        travellerId: pointsLedger.travellerId,
        balance: sql<number>`sum(${pointsLedger.delta})::int`,
        lastLedgerAt: sql<Date>`max(${pointsLedger.createdAt})`,
      })
      .from(pointsLedger)
      .groupBy(pointsLedger.travellerId);
    const bookingAgg = await tx
      .select({
        travellerId: bookings.travellerId,
        lastBookingAt: sql<Date>`max(${bookings.createdAt})`,
      })
      .from(bookings)
      .groupBy(bookings.travellerId);
    return { ledgerAgg, bookingAgg };
  });

  const lastBookingByTraveller = new Map(bookingAgg.map((b) => [b.travellerId, new Date(b.lastBookingAt)]));

  const toExpire: { travellerId: string; balance: number }[] = [];
  const toRemind: string[] = [];
  for (const row of ledgerAgg) {
    if (row.balance <= 0) continue;
    const lastLedgerAt = new Date(row.lastLedgerAt);
    const lastBookingAt = lastBookingByTraveller.get(row.travellerId);
    const lastActivityAt = lastBookingAt && lastBookingAt > lastLedgerAt ? lastBookingAt : lastLedgerAt;

    if (lastActivityAt < expiryCutoff) {
      toExpire.push({ travellerId: row.travellerId, balance: row.balance });
    } else if (lastActivityAt >= reminderWindowStart && lastActivityAt < reminderWindowEnd) {
      toRemind.push(row.travellerId);
    }
  }

  if (toExpire.length > 0) {
    await withRlsContext({ role: "admin" }, (tx) =>
      Promise.all(
        toExpire.map(({ travellerId, balance }) =>
          tx.insert(pointsLedger).values({
            travellerId,
            delta: -balance,
            reason: `Points expired after ${EXPIRY_DAYS} days of inactivity`,
            sourceType: "points_expiry",
          }),
        ),
      ),
    );
  }

  if (toRemind.length > 0) {
    const recipients = await withRlsContext({ role: "admin" }, (tx) =>
      tx
        .select({ travellerId: travellerProfiles.id, email: users.email, name: users.name })
        .from(travellerProfiles)
        .innerJoin(users, eq(users.id, travellerProfiles.userId)),
    );
    const remindSet = new Set(toRemind);
    for (const r of recipients) {
      if (!remindSet.has(r.travellerId)) continue;
      await notifyUser(r.email, "Your points expire in 30 days", [
        `Hi ${r.name},`,
        `Your Wano Rewards points will expire in ${REMINDER_DAYS_BEFORE} days unless you book or earn more points before then.`,
        "Book a listing or claim a reward to keep them active.",
      ]);
    }
  }

  return NextResponse.json({ ok: true, expired: toExpire.length, reminded: toRemind.length });
}
