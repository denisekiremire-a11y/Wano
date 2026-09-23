export function formatRewardDiscount(discountType: "percent" | "fixed" | "freebie", discountValue: string | null) {
  if (discountType === "freebie") return "Free";
  if (discountType === "percent") return `${discountValue}% off`;
  const amount = discountValue ? Number.parseFloat(discountValue) : 0;
  return `${amount.toLocaleString()} UGX off`;
}
