export function formatRewardDiscount(discountType: "percent" | "fixed" | "freebie", discountValue: string | null) {
  if (discountType === "freebie") return "Free";
  if (discountType === "percent") return `${discountValue}% off`;
  const amount = discountValue ? Number.parseFloat(discountValue) : 0;
  return `${amount.toLocaleString()} UGX off`;
}

// Flat point thresholds for the Passport progress bar — purely a
// motivational marker (there's no auto-granted prize tied to these, just
// "you're getting closer"), not a tier/unlock system.
const POINT_MILESTONES = [250, 500, 1000, 2000, 5000];

/** The nearest milestone above the traveller's current points, and how far
 * along they are toward it (0-100). Past the last milestone, the bar just
 * shows full at that ceiling. */
export function getPointsProgress(totalPoints: number) {
  const next = POINT_MILESTONES.find((m) => m > totalPoints) ?? POINT_MILESTONES[POINT_MILESTONES.length - 1];
  const prev = POINT_MILESTONES.filter((m) => m <= totalPoints).at(-1) ?? 0;
  const percent = next === prev ? 100 : Math.min(100, Math.round(((totalPoints - prev) / (next - prev)) * 100));
  return { next, percent };
}
