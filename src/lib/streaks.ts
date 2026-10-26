// Weekly streaks. A week (Monday to Sunday, Kampala time) counts when the
// member has at least one verified visit. One week a month may be missed
// without breaking the run (the "skip week"); a second miss in the same
// month ends it. The week in progress never breaks a streak, so nobody is
// nagged mid-week. Milestones pay Passport XP once per run.

export const STREAK_MILESTONES = [
  { weeks: 4, xp: 300 },
  { weeks: 12, xp: 1000 },
] as const;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function addWeeks(weekStartIso: string, n: number) {
  return new Date(Date.parse(`${weekStartIso}T00:00:00Z`) + n * WEEK_MS).toISOString().slice(0, 10);
}

export type StreakStatus = {
  /** Weeks with a visit in the current run (skip weeks don't add). */
  current: number;
  best: number;
  /** True when this month's skip week is still unused. */
  skipAvailable: boolean;
  /** Whether the week in progress already has a visit. */
  thisWeekDone: boolean;
  /** Milestones reached, with the week they were reached in. */
  milestones: { weeks: number; xp: number; weekStart: string }[];
};

/** `visitWeeks` are the Monday dates (YYYY-MM-DD) of weeks with a visit. */
export function computeStreak(visitWeeks: Iterable<string>, currentWeekIso: string): StreakStatus {
  const weeks = new Set(visitWeeks);
  const sorted = [...weeks].filter((w) => w <= currentWeekIso).sort();
  const thisWeekDone = weeks.has(currentWeekIso);
  if (sorted.length === 0) {
    return { current: 0, best: 0, skipAvailable: true, thisWeekDone, milestones: [] };
  }

  let run = 0;
  let best = 0;
  let skippedMonth: string | null = null;
  const milestones: StreakStatus["milestones"] = [];
  let paidThisRun = new Set<number>();

  for (let w = sorted[0]; w <= currentWeekIso; w = addWeeks(w, 1)) {
    const month = w.slice(0, 7);
    if (weeks.has(w)) {
      run += 1;
      best = Math.max(best, run);
      for (const m of STREAK_MILESTONES) {
        if (run >= m.weeks && !paidThisRun.has(m.weeks)) {
          paidThisRun.add(m.weeks);
          milestones.push({ ...m, weekStart: w });
        }
      }
    } else if (w === currentWeekIso) {
      // Week still in progress: never a miss yet.
    } else if (run > 0 && skippedMonth !== month) {
      skippedMonth = month;
    } else {
      run = 0;
      skippedMonth = null;
      paidThisRun = new Set();
    }
  }

  return {
    current: run,
    best,
    skipAvailable: skippedMonth !== currentWeekIso.slice(0, 7),
    thisWeekDone,
    milestones,
  };
}
