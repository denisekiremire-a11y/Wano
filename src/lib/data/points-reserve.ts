import "server-only";
import { and, gte, inArray, sql } from "drizzle-orm";
import { bookings, pointsLedger } from "@/db/schema";
import { withRlsContext } from "@/lib/db-context";
import { POINT_VALUE_MINOR } from "@/lib/data/points";
import { REWARDS_SHARE_GUARDRAIL } from "@/lib/rewards-config";

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export type PointsReserveStatus = {
  /** Every traveller's current balance, summed, valued in UGX — Wano's
   * outstanding liability for points earned but not yet spent or expired. */
  confirmedUnspentMinor: number;
  issuedThisMonthMinor: number;
  redeemedThisMonthMinor: number;
  commissionThisMonthMinor: number;
  /** Points issued this month as a share of commission earned this month —
   * null while there's no commission yet to divide by. */
  rewardsShareOfCommission: number | null;
  guardrail: number;
  overGuardrail: boolean;
};

/** Admin-only report (super, see admin-permissions.ts) — the UGX cost of
 * every point on the books, how fast that's moving this month, and
 * whether rewards are eating too much of what the Part B pilot is
 * actually earning in commission. Reads points_ledger/bookings under
 * admin RLS context since both are "select own or admin"-policied and
 * this report spans every traveller, not just one. */
export async function getPointsReserveStatus(): Promise<PointsReserveStatus> {
  const monthStart = startOfCurrentMonth();

  const { balanceRow, monthRow, commissionRow } = await withRlsContext({ role: "admin" }, async (tx) => {
    const [balanceRow] = await tx
      .select({ balance: sql<number>`coalesce(sum(${pointsLedger.delta}), 0)::int` })
      .from(pointsLedger);
    const [monthRow] = await tx
      .select({
        issued: sql<number>`coalesce(sum(case when ${pointsLedger.delta} > 0 then ${pointsLedger.delta} else 0 end), 0)::int`,
        redeemed: sql<number>`coalesce(sum(case when ${pointsLedger.delta} < 0 then -${pointsLedger.delta} else 0 end), 0)::int`,
      })
      .from(pointsLedger)
      .where(gte(pointsLedger.createdAt, monthStart));
    const [commissionRow] = await tx
      .select({ commission: sql<number>`coalesce(sum(${bookings.estimatedCommission}), 0)::numeric` })
      .from(bookings)
      .where(and(inArray(bookings.status, ["confirmed", "completed"]), gte(bookings.createdAt, monthStart)));
    return { balanceRow, monthRow, commissionRow };
  });

  const confirmedUnspentMinor = (balanceRow?.balance ?? 0) * POINT_VALUE_MINOR;
  const issuedThisMonthMinor = (monthRow?.issued ?? 0) * POINT_VALUE_MINOR;
  const redeemedThisMonthMinor = (monthRow?.redeemed ?? 0) * POINT_VALUE_MINOR;
  const commissionThisMonthMinor = Number(commissionRow?.commission ?? 0);

  const rewardsShareOfCommission =
    commissionThisMonthMinor > 0 ? issuedThisMonthMinor / commissionThisMonthMinor : null;

  return {
    confirmedUnspentMinor,
    issuedThisMonthMinor,
    redeemedThisMonthMinor,
    commissionThisMonthMinor,
    rewardsShareOfCommission,
    guardrail: REWARDS_SHARE_GUARDRAIL,
    overGuardrail: rewardsShareOfCommission != null && rewardsShareOfCommission > REWARDS_SHARE_GUARDRAIL,
  };
}
