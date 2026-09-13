"use client";

import { useSeason } from "@/components/season/season-provider";
import type { SeasonPhase } from "@/lib/season/season";

const PHASES: { id: SeasonPhase; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "buildup", label: "Buildup" },
  { id: "live", label: "Live" },
  { id: "matchday", label: "Match day" },
  { id: "afterglow", label: "Afterglow" },
];

/** Forces any season phase without touching the system clock — for demos
 * only. The caller (see app/layout.tsx) decides who ever sees this; it has
 * no gate of its own, so it must never be rendered unconditionally. */
export function SeasonDemoSwitch() {
  const { phase, overridePhase, setOverridePhase } = useSeason();

  return (
    <div className="fixed bottom-20 left-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-1 rounded-xl border border-forest-900/15 bg-white/95 p-2 text-[11px] shadow-lg backdrop-blur md:bottom-4">
      <span className="w-full text-[10px] font-semibold uppercase tracking-wide text-forest-800/50">
        Season demo — currently {phase}
      </span>
      {PHASES.map((p) => (
        <button
          key={p.id}
          type="button"
          aria-pressed={overridePhase === p.id}
          onClick={() => setOverridePhase(overridePhase === p.id ? null : p.id)}
          className={`rounded-full border px-2 py-1 font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 ${
            overridePhase === p.id
              ? "border-forest-800 bg-forest-800 text-white"
              : "border-forest-900/15 text-forest-800 hover:border-forest-900/30"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
