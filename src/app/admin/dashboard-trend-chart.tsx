"use client";

import { useId, useState } from "react";

type DayPoint = { date: string; count: number };

const SLOT_WIDTH = 18;
const BAR_WIDTH = 12;
const CHART_HEIGHT = 96;
const BASELINE_Y = 88;
const PLOT_HEIGHT = 72;
const BAR_RADIUS = 3;

function formatDayLabel(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** A rounded-top, square-bottom bar — the mark spec is a 4px data-end radius
 * anchored to the baseline, never a fully rounded pill. Degrades to a plain
 * rounded rect when the bar is shorter than the radius (an empty/near-empty
 * day), so the path never folds in on itself. */
function barPath(x: number, height: number) {
  const y = BASELINE_Y - height;
  if (height <= BAR_RADIUS) {
    return `M${x},${BASELINE_Y} v${-height} h${BAR_WIDTH} v${height} z`;
  }
  return [
    `M${x},${BASELINE_Y}`,
    `V${y + BAR_RADIUS}`,
    `Q${x},${y} ${x + BAR_RADIUS},${y}`,
    `H${x + BAR_WIDTH - BAR_RADIUS}`,
    `Q${x + BAR_WIDTH},${y} ${x + BAR_WIDTH},${y + BAR_RADIUS}`,
    `V${BASELINE_Y}`,
    "Z",
  ].join(" ");
}

/** The 30-day bookings trend — the one chart on the dashboard, so it's a
 * single sequential series (the accent hue) rather than anything
 * categorical. Hover/focus reads the exact day + count; the <details>
 * below is the same data as a table, so nothing here is tooltip-only. */
export function DashboardTrendChart({ days }: { days: DayPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const gradientId = useId();
  const max = Math.max(1, ...days.map((d) => d.count));
  const width = days.length * SLOT_WIDTH;
  const activeDay = active != null ? days[active] : null;

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
          className="h-24 w-full overflow-visible"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Bookings per day, last ${days.length} days`}
        >
          <line
            x1={0}
            y1={BASELINE_Y - PLOT_HEIGHT}
            x2={width}
            y2={BASELINE_Y - PLOT_HEIGHT}
            className="stroke-forest-900/10"
            strokeWidth={1}
          />
          <line x1={0} y1={BASELINE_Y} x2={width} y2={BASELINE_Y} className="stroke-forest-900/15" strokeWidth={1} />
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-nile-700)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="var(--color-nile-700)" stopOpacity="0.65" />
            </linearGradient>
          </defs>
          {days.map((day, i) => {
            const height = Math.max(2, (day.count / max) * PLOT_HEIGHT);
            const x = i * SLOT_WIDTH + (SLOT_WIDTH - BAR_WIDTH) / 2;
            const isActive = active === i;
            return (
              <g
                key={day.date}
                tabIndex={0}
                role="button"
                aria-label={`${formatDayLabel(day.date)}: ${day.count} booking${day.count === 1 ? "" : "s"}`}
                className="cursor-default outline-none"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                {/* Hit target wider than the bar itself, full plot height. */}
                <rect x={i * SLOT_WIDTH} y={0} width={SLOT_WIDTH} height={CHART_HEIGHT} fill="transparent" />
                <path
                  d={barPath(x, height)}
                  fill={isActive ? "var(--color-nile-700)" : `url(#${gradientId})`}
                  className="transition-[fill] duration-150"
                />
              </g>
            );
          })}
        </svg>
        {activeDay && (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-forest-900/10 bg-forest-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
            style={{ left: `${((active! + 0.5) / days.length) * 100}%` }}
          >
            <p className="font-semibold tabular-nums">{activeDay.count} booking{activeDay.count === 1 ? "" : "s"}</p>
            <p className="text-[11px] text-white/70">{formatDayLabel(activeDay.date)}</p>
          </div>
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-forest-800/40">
        <span>{formatDayLabel(days[0].date)}</span>
        <span>{formatDayLabel(days[days.length - 1].date)}</span>
      </div>
      <details className="mt-2 text-xs text-forest-800/60">
        <summary className="cursor-pointer select-none font-medium">View as table</summary>
        <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-forest-900/10">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-forest-50 text-forest-800/50">
              <tr>
                <th className="px-2 py-1 font-medium">Date</th>
                <th className="px-2 py-1 text-right font-medium">Bookings</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.date} className="border-t border-forest-900/5">
                  <td className="px-2 py-1">{formatDayLabel(day.date)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{day.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
