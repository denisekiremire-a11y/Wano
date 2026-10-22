import type { Tier } from "@/lib/data/points";

const TIER_LABEL: Record<Tier, string> = {
  explorer: "Explorer",
  insider: "Insider",
  legend: "Legend",
};

/** Tier badge + progress-to-next-tier bar, shown wherever a traveller's
 * XP/points tier matters (Passport header, Rewards tab, admin lookup).
 * Purely presentational — callers pass the already-computed getTierStatus
 * result. */
export function TierBadge({
  tier,
  nextTier,
  progressToNextTier,
  remainingToNextTier,
  compact = false,
}: {
  tier: Tier;
  nextTier: "insider" | "legend" | null;
  progressToNextTier: number;
  remainingToNextTier: number;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "flex-none" : "flex-none border border-ink/10 bg-white px-4 py-2.5"}>
      <p className="eyebrow text-ember">{TIER_LABEL[tier]}</p>
      <div className="mt-1.5 h-[3px] w-24 bg-ink/10">
        <div
          className="h-full bg-ember transition-all"
          style={{ width: `${Math.round(progressToNextTier * 100)}%` }}
        />
      </div>
      <p className="font-mono-data mt-1 text-[11px] text-ink/50">
        {nextTier ? `${remainingToNextTier.toLocaleString()} to ${TIER_LABEL[nextTier]}` : "Top tier"}
      </p>
    </div>
  );
}
