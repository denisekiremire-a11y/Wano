import { CURRENCY, formatAmount, toNumber } from "./currency";
import type { Gift, PriceBasis } from "./types";

export const BASIS_LABEL: Record<PriceBasis, string> = {
  shelf_tag: "In-store price",
  online: "Online price",
  estimate: "Estimated price",
};

export const BASIS_EXPLANATION: Record<PriceBasis, string> = {
  shelf_tag: "Shelf-tag price photographed in store when the list was made.",
  online: "Online price at Peekaboo Uganda (peekaboo.ug) when the list was updated.",
  estimate: "An estimate, not a confirmed retailer price.",
};

type PriceFields = Pick<
  Gift,
  "price_aed" | "sale_price_aed" | "price_min_aed" | "price_max_aed" | "price_unit" | "price_basis" | "reference_price_aed"
>;

export interface PriceView {
  /** The price in the registry currency, e.g. "UGX 1,006,800" or "UGX 40,000–60,000" */
  aed: string;
  /** Always null: no second currency is shown any more. */
  ugx: string | null;
  /** Original price when on sale */
  wasAed: string | null;
  wasUgx: string | null;
  isRange: boolean;
  isSale: boolean;
  unit: string | null;
  basis: PriceBasis;
  hasPrice: boolean;
}

function rangeText(min: number, max: number, fmt: (n: number) => string) {
  return min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`;
}

/**
 * How a gift's price is shown. Everything is in the registry currency (UGX); `ugx`/`wasUgx` are
 * always null now that no second currency is shown.
 */
export function priceView(g: PriceFields): PriceView {
  const price = toNumber(g.price_aed);
  const sale = toNumber(g.sale_price_aed);
  const min = toNumber(g.price_min_aed);
  const max = toNumber(g.price_max_aed);
  const base = { unit: g.price_unit ?? null, basis: g.price_basis, wasAed: null, ugx: null, wasUgx: null, isSale: false, isRange: false };
  const money = (n: number) => `${CURRENCY} ${formatAmount(n)}`;

  if (sale !== null) {
    return { ...base, aed: money(sale), wasAed: price !== null && price > sale ? money(price) : null, isSale: true, hasPrice: true };
  }
  if (price !== null) return { ...base, aed: money(price), hasPrice: true };
  if (min !== null && max !== null) {
    return { ...base, aed: `${CURRENCY} ${rangeText(min, max, formatAmount)}`, isRange: min !== max, hasPrice: true };
  }
  const single = min ?? max;
  if (single !== null) return { ...base, aed: money(single), hasPrice: true };
  return { ...base, aed: "Price to be confirmed", hasPrice: false };
}
