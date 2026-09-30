export type RewardDiscountType = "percent" | "fixed" | "freebie" | "spend_perk" | "points";

export function formatRewardDiscount(
  discountType: RewardDiscountType,
  discountValue: string | null,
  minBillMinor?: number | null,
) {
  if (discountType === "freebie") return "Free";
  if (discountType === "points") return `${discountValue ?? 0} points`;
  if (discountType === "percent") return `${discountValue}% off`;
  if (discountType === "spend_perk") {
    const bill = minBillMinor ? `${minBillMinor.toLocaleString()} UGX+ bill` : "min bill";
    return `${discountValue}% off (${bill})`;
  }
  const amount = discountValue ? Number.parseFloat(discountValue) : 0;
  return `${amount.toLocaleString()} UGX off`;
}
