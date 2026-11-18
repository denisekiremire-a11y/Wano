/**
 * The registry's one currency. Gifts now come from Peekaboo Uganda (peekaboo.ug), whose prices
 * are in Ugandan shillings, so every price is stored and shown in UGX. (The database columns keep
 * their historical `_aed` names; they hold amounts in this currency.)
 *
 * The AED→UGX conversion helpers below are kept for the stored rate history only; no page
 * converts prices any more.
 */
export const CURRENCY = "UGX";

const moneyFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatAmount(amount: number): string {
  return moneyFmt.format(amount);
}

/** e.g. "UGX 1,006,800"; "—" when there is no amount. */
export function formatPrice(amount: number | string | null | undefined): string {
  const n = toNumber(amount);
  return n === null ? "—" : `${CURRENCY} ${formatAmount(n)}`;
}

const aedInt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const aedDec = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ugxFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function toNumber(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function formatAedAmount(amount: number): string {
  return Number.isInteger(amount) ? aedInt.format(amount) : aedDec.format(amount);
}

export function formatAED(amount: number | string | null | undefined): string {
  const n = toNumber(amount);
  return n === null ? "—" : `AED ${formatAedAmount(n)}`;
}

export function isValidRate(rate: number | string | null | undefined): rate is number {
  const n = toNumber(rate);
  return n !== null && n > 0;
}

/**
 * Converts AED to UGX. Results are rounded to the nearest 100 UGX because the conversion is
 * approximate anyway; showing shilling-level precision would suggest false accuracy.
 */
export function aedToUgx(amountAed: number | string | null | undefined, rate: number | string | null | undefined): number | null {
  const a = toNumber(amountAed);
  const r = toNumber(rate);
  if (a === null || r === null || r <= 0) return null;
  return Math.round((a * r) / 100) * 100;
}

export function formatUgxAmount(amount: number): string {
  return ugxFmt.format(amount);
}

export function formatUGX(amountAed: number | string | null | undefined, rate: number | string | null | undefined): string | null {
  const ugx = aedToUgx(amountAed, rate);
  return ugx === null ? null : `UGX ${formatUgxAmount(ugx)}`;
}
