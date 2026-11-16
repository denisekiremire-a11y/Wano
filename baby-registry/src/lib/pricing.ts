import { aedToUgx, formatAedAmount, formatUgxAmount, toNumber } from "./currency";
import type { Gift, PriceBasis } from "./types";

export const BASIS_LABEL: Record<PriceBasis, string> = {
  shelf_tag: "In-store price",
  online: "Online price",
  estimate: "Estimated price",
};

export const BASIS_EXPLANATION: Record<PriceBasis, string> = {
  shelf_tag: "Shelf-tag price photographed in store when the list was made.",
  online: "Online price from a UAE retailer when the list was made.",
  estimate: "An estimate, not a confirmed retailer price.",
};

type PriceFields = Pick<
  Gift,
  "price_aed" | "sale_price_aed" | "price_min_aed" | "price_max_aed" | "price_unit" | "price_basis" | "reference_price_aed"
>;

export interface PriceView {
  /** e.g. "AED 1,874" or "AED 800–1,500" */
  aed: string;
  /** e.g. "UGX 1,874,000" — null until an exchange rate is configured */
  ugx: string | null;
  /** Original price when on sale, e.g. "AED 2,499" */
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

export function priceView(g: PriceFields, rate: number | null | undefined): PriceView {
  const price = toNumber(g.price_aed);
  const sale = toNumber(g.sale_price_aed);
  const min = toNumber(g.price_min_aed);
  const max = toNumber(g.price_max_aed);
  const base = { unit: g.price_unit ?? null, basis: g.price_basis, wasAed: null, wasUgx: null, isSale: false, isRange: false };

  const ugxOf = (n: number) => {
    const v = aedToUgx(n, rate);
    return v === null ? null : formatUgxAmount(v);
  };

  if (sale !== null) {
    const ugx = ugxOf(sale);
    return {
      ...base,
      aed: `AED ${formatAedAmount(sale)}`,
      ugx: ugx ? `UGX ${ugx}` : null,
      wasAed: price !== null && price > sale ? `AED ${formatAedAmount(price)}` : null,
      wasUgx: price !== null && price > sale && ugxOf(price) ? `UGX ${ugxOf(price)}` : null,
      isSale: true,
      hasPrice: true,
    };
  }
  if (price !== null) {
    const ugx = ugxOf(price);
    return { ...base, aed: `AED ${formatAedAmount(price)}`, ugx: ugx ? `UGX ${ugx}` : null, hasPrice: true };
  }
  if (min !== null && max !== null) {
    const lo = ugxOf(min);
    const hi = ugxOf(max);
    return {
      ...base,
      aed: `AED ${rangeText(min, max, formatAedAmount)}`,
      ugx: lo && hi ? `UGX ${min === max ? lo : `${lo}–${hi}`}` : null,
      isRange: min !== max,
      hasPrice: true,
    };
  }
  const single = min ?? max;
  if (single !== null) {
    const ugx = ugxOf(single);
    return { ...base, aed: `AED ${formatAedAmount(single)}`, ugx: ugx ? `UGX ${ugx}` : null, hasPrice: true };
  }
  return { ...base, aed: "Price to be confirmed", ugx: null, hasPrice: false };
}
