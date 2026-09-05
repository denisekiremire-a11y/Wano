/** UGX has no minor subunit in practice, so "minor" here just means the
 * whole-shilling integer stored on the row — formatted with thousands
 * separators, no decimals. */
export function formatMinor(amountMinor: number, currency = "UGX") {
  return `${currency} ${new Intl.NumberFormat("en-UG").format(amountMinor)}`;
}

export function formatCostRange(minMinor: number, maxMinor: number, currency = "UGX") {
  if (minMinor === maxMinor) return formatMinor(minMinor, currency);
  return `${currency} ${new Intl.NumberFormat("en-UG").format(minMinor)} – ${new Intl.NumberFormat("en-UG").format(maxMinor)}`;
}

/** bookings.estimatedCommission is a decimal string/number (e.g. "15.00")
 * denominated in USD — Wano's own referral fee, tracked separately from the
 * UGX price the traveller pays. Formats it properly instead of the raw
 * `$${n.toFixed(2)}` concatenation this used to be, which had no thousands
 * separator. */
export function formatCommission(amount: string | number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(amount));
}

/** The one formatter for a listing's price line — "From UGX 670,000/night",
 * "Mains from UGX 30,000". Null when there's no price to show yet (an
 * incomplete listing never reaches this — see listingPublishConditions). */
export function formatListingPrice(listing: {
  priceLabel: string;
  priceMinor: number | null;
  currency: string;
  priceUnit: string | null;
}): string | null {
  if (listing.priceMinor == null) return null;
  return `${listing.priceLabel} ${formatMinor(listing.priceMinor, listing.currency)}${listing.priceUnit ?? ""}`;
}
