import { toNumber } from "./currency";
import type { Category, Gift } from "./types";

export interface StatusCounts {
  total: number;
  available: number;
  reserved: number;
  purchased: number;
  /** reserved + purchased */
  claimed: number;
  /** 0–100 */
  percentClaimed: number;
}

export function statusCounts(gifts: Pick<Gift, "status">[]): StatusCounts {
  const available = gifts.filter((g) => g.status === "available").length;
  const reserved = gifts.filter((g) => g.status === "reserved").length;
  const purchased = gifts.filter((g) => g.status === "purchased").length;
  const total = gifts.length;
  const claimed = reserved + purchased;
  return { total, available, reserved, purchased, claimed, percentClaimed: total ? Math.round((claimed / total) * 100) : 0 };
}

const sum = (gs: Gift[]) => gs.reduce((acc, g) => acc + (toNumber(g.reference_price_aed) ?? 0), 0);
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface CategoryTotals {
  category: Category;
  items: number;
  alternatives: number;
  liveBudget: number;
  liveFull: number;
  liveAllExcludingAlternatives: number;
  docBudget: number | null;
  docFull: number | null;
}

export interface LiveTotals {
  /** Items flagged as part of the original "budget" scenario. */
  budget: number;
  /** Items flagged as part of the original "full wishlist" scenario. */
  full: number;
  /** Every item on the registry except alternatives. */
  allExcludingAlternatives: number;
  /** Every item including alternatives (would double-count needs — informational only). */
  everything: number;
  reservedValue: number;
  purchasedValue: number;
  unpricedItems: number;
  byCategory: CategoryTotals[];
}

/**
 * Live totals from the database. Each item contributes its reference price: the sale price if
 * there is one, otherwise the listed price, otherwise the middle of its estimated range — the
 * same rule the original document used for its estimates.
 */
export function liveTotals(gifts: Gift[], categories: Category[]): LiveTotals {
  const byCategory = [...categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => {
      const gs = gifts.filter((g) => g.category_id === c.id);
      return {
        category: c,
        items: gs.length,
        alternatives: gs.filter((g) => g.is_alternative).length,
        liveBudget: round2(sum(gs.filter((g) => g.in_doc_budget))),
        liveFull: round2(sum(gs.filter((g) => g.in_doc_full))),
        liveAllExcludingAlternatives: round2(sum(gs.filter((g) => !g.is_alternative))),
        docBudget: toNumber(c.doc_budget_aed),
        docFull: toNumber(c.doc_full_aed),
      };
    });
  return {
    budget: round2(sum(gifts.filter((g) => g.in_doc_budget))),
    full: round2(sum(gifts.filter((g) => g.in_doc_full))),
    allExcludingAlternatives: round2(sum(gifts.filter((g) => !g.is_alternative))),
    everything: round2(sum(gifts)),
    reservedValue: round2(sum(gifts.filter((g) => g.status === "reserved"))),
    purchasedValue: round2(sum(gifts.filter((g) => g.status === "purchased"))),
    unpricedItems: gifts.filter((g) => toNumber(g.reference_price_aed) === null).length,
    byCategory,
  };
}

/** Number of rows created within the last `ms` milliseconds. */
export function countSince(rows: { created_at: string }[], ms: number, now = Date.now()): number {
  return rows.filter((r) => now - new Date(r.created_at).getTime() < ms).length;
}
