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
