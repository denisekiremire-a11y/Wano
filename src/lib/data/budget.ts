import "server-only";
import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { rewards, userRewards } from "@/db/schema";
import { logAdminAction } from "@/lib/admin-action-log";
import { withRlsContext } from "@/lib/db-context";

// UGX 1,000,000/month — only Wano's share of a redeemed discount counts
// against this (see getMonthlyWanoSpend); the venue's share never does.
export const WANO_MONTHLY_BUDGET_MINOR = 1_000_000;
export const WANO_BUDGET_WARNING_PCT = 80;

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** This month's Wano-funded spend. Only rewards with a wanoSharePct set
 * are ever Wano-funded — a venue-only reward (wanoSharePct null) never
 * counts here, matching "only Wano's share of redeemed discounts counts
 * against it." */
export async function getMonthlyWanoSpend(monthStart: Date = startOfCurrentMonth()): Promise<number> {
  const [row] = await db
    .select({
      spent: sql<number>`coalesce(sum(round(${userRewards.discountAmountMinor} * ${rewards.wanoSharePct} / 100.0)), 0)::int`,
    })
    .from(userRewards)
    .innerJoin(rewards, eq(userRewards.rewardId, rewards.id))
    .where(
      and(
        eq(userRewards.status, "redeemed"),
        isNotNull(rewards.wanoSharePct),
        isNotNull(userRewards.discountAmountMinor),
        gte(userRewards.redeemedAt, monthStart),
      ),
    );
  return row?.spent ?? 0;
}

export async function getBudgetStatus() {
  const spentMinor = await getMonthlyWanoSpend();
  const pct = WANO_MONTHLY_BUDGET_MINOR > 0 ? Math.round((spentMinor / WANO_MONTHLY_BUDGET_MINOR) * 100) : 0;
  return {
    spentMinor,
    budgetMinor: WANO_MONTHLY_BUDGET_MINOR,
    pct,
    warning: pct >= WANO_BUDGET_WARNING_PCT && pct < 100,
    exceeded: pct >= 100,
  };
}

/** Called right after a redemption that might be Wano-funded — recomputes
 * this month's spend and, once it's hit the monthly cap, pauses every
 * currently-active Wano-funded reward so no further Wano-funded discount
 * can be redeemed until next month (or an admin resumes one manually).
 * A venue-only reward (wanoSharePct null) is never touched. actorUserId is
 * whoever's action triggered this check (the redeeming vendor's user, or
 * the admin who just changed a reward) — there's no separate "system"
 * account, so the admin action log records the pause against them with a
 * summary that makes clear it was an automatic budget trip, not something
 * they did directly. */
export async function enforceBudgetCapIfNeeded(actorUserId: string) {
  const spentMinor = await getMonthlyWanoSpend();
  if (spentMinor < WANO_MONTHLY_BUDGET_MINOR) return;

  const paused = await withRlsContext({ role: "admin" }, (tx) =>
    tx
      .update(rewards)
      .set({ status: "paused", active: false })
      .where(and(eq(rewards.status, "active"), isNotNull(rewards.wanoSharePct)))
      .returning({ id: rewards.id, title: rewards.title }),
  );
  if (paused.length === 0) return;

  await logAdminAction(
    actorUserId,
    "reward.budget_auto_paused",
    `Monthly Wano-funded budget (${WANO_MONTHLY_BUDGET_MINOR.toLocaleString()} UGX) reached — system auto-paused ${paused.length} reward(s): ${paused.map((r) => r.title).join(", ")}`,
  );
}
