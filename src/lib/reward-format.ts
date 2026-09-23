export function formatRewardDiscount(discountType: "percent" | "fixed" | "freebie", discountValue: string | null) {
  if (discountType === "freebie") return "Free";
  if (discountType === "percent") return `${discountValue}% off`;
  const amount = discountValue ? Number.parseFloat(discountValue) : 0;
  return `${amount.toLocaleString()} UGX off`;
}

// Points-milestone ladder — crossing one auto-grants a voucher (see
// checkAndGrantMilestoneRewards in reward-actions.ts). Repeats every
// MILESTONE_REPEAT_STEP past the last rung, indefinitely, reusing that
// rung's configured reward each time.
export const MILESTONE_LADDER = [250, 500, 1000, 2000, 5000];
const MILESTONE_REPEAT_STEP = 2500;

/** The next threshold after `claimed` (0 = nothing claimed yet). Follows
 * the fixed ladder, then repeats every MILESTONE_REPEAT_STEP past its
 * last rung — the single source of truth both the progress bar and the
 * granting logic use, so they can never drift apart. */
export function getNextMilestoneThreshold(claimed: number): number {
  const next = MILESTONE_LADDER.find((m) => m > claimed);
  if (next) return next;
  const last = MILESTONE_LADDER.at(-1)!;
  const stepsPast = Math.floor((claimed - last) / MILESTONE_REPEAT_STEP) + 1;
  return last + stepsPast * MILESTONE_REPEAT_STEP;
}

/** Which reward row to grant for a given threshold — every repeat past
 * the ladder's last rung reuses that rung's configured reward, so only
 * 5 milestone rewards ever need to exist in the catalog. */
export function getMilestoneRewardThreshold(threshold: number): number {
  const last = MILESTONE_LADDER.at(-1)!;
  return Math.min(threshold, last);
}

/** How far a traveller is toward their next milestone (0-100), and what
 * that next threshold is. Unlike the old flat-ladder version, this keeps
 * advancing past the ladder's last rung instead of stalling at 100%. */
export function getPointsProgress(totalPoints: number) {
  const next = getNextMilestoneThreshold(totalPoints);
  const last = MILESTONE_LADDER.at(-1)!;
  const prev =
    totalPoints >= last
      ? next - MILESTONE_REPEAT_STEP
      : ([0, ...MILESTONE_LADDER].filter((m) => m <= totalPoints).at(-1) ?? 0);
  const percent = next === prev ? 100 : Math.min(100, Math.round(((totalPoints - prev) / (next - prev)) * 100));
  return { next, percent };
}
