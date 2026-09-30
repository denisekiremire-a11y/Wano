import "server-only";
import { and, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { pointsLedger, travellerProfiles, users } from "@/db/schema";
import { withRlsContext } from "@/lib/db-context";

// 1 point = UGX 50 (business rule). Tiers are based on points *earned* in
// the trailing 12 months, not lifetime — a corrective reversing entry
// reduces the earned total for that window, same as it reduces balance.
export const POINT_VALUE_MINOR = 50;
export const TIER_THRESHOLDS = { insider: 1000, legend: 5000 } as const;
export type Tier = "legend" | "insider" | null;

export function tierForPoints(earnedLast12Months: number): Tier {
  if (earnedLast12Months >= TIER_THRESHOLDS.legend) return "legend";
  if (earnedLast12Months >= TIER_THRESHOLDS.insider) return "insider";
  return null;
}

function twelveMonthsAgo() {
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

export async function getPointsEarnedLast12Months(travellerId: string): Promise<number> {
  const [row] = await db
    .select({ earned: sql<number>`coalesce(sum(${pointsLedger.delta}), 0)::int` })
    .from(pointsLedger)
    .where(and(eq(pointsLedger.travellerId, travellerId), gte(pointsLedger.createdAt, twelveMonthsAgo())));
  return row?.earned ?? 0;
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
