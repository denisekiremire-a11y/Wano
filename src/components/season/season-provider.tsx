"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AFCON_KICKOFF } from "@/lib/afcon/anchors";
import {
  computeSeasonPhase,
  daysUntil,
  getNextFixture,
  getTodaysFixture,
  type FixtureLite,
  type SeasonPhase,
} from "@/lib/season/season";

type SeasonContextValue = {
  phase: SeasonPhase;
  /** The fixture to show for matchday copy — today's real fixture normally;
   * when a demo override forces "matchday" outside the real tournament
   * window (there's never a real fixture on today's actual date before
   * 2027), falls back to the next upcoming one so the demo has something
   * to show. */
  matchdayFixture: FixtureLite | null;
  nextFixture: FixtureLite | null;
  daysToKickoff: number;
  overridePhase: SeasonPhase | null;
  setOverridePhase: (phase: SeasonPhase | null) => void;
};

const SeasonContext = createContext<SeasonContextValue | null>(null);

export function SeasonProvider({
  enabled,
  fixtures,
  children,
}: {
  enabled: boolean;
  fixtures: FixtureLite[];
  children: React.ReactNode;
}) {
  // Stays null through SSR and the client's first paint — the phase is a
  // function of "right now", which the server and the browser can never be
  // trusted to agree on byte-for-byte, so nothing renders until an effect
  // (never the render itself) resolves a real clock reading.
  const [now, setNow] = useState<Date | null>(null);
  const [overridePhase, setOverridePhase] = useState<SeasonPhase | null>(null);

  useEffect(() => {
    function tick() {
      setNow(new Date());
    }
    const initial = setTimeout(tick, 0);
    const interval = setInterval(tick, 60_000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  const todaysFixture = useMemo(() => (now ? getTodaysFixture(fixtures, now) : null), [fixtures, now]);
  const nextFixture = useMemo(() => (now ? getNextFixture(fixtures, now) : null), [fixtures, now]);
  const computedPhase = useMemo(
    () => (now ? computeSeasonPhase(now, todaysFixture) : "off"),
    [now, todaysFixture],
  );
  const daysToKickoff = now ? daysUntil(AFCON_KICKOFF, now) : 0;

  // The whole skin lives behind one flag, same as the rest of the AFCON
  // campaign — when it's off, phase is unconditionally "off" (including the
  // demo override, so there's nothing to accidentally leave half-switched-on).
  const phase: SeasonPhase = enabled ? (overridePhase ?? computedPhase) : "off";
  const matchdayFixture = phase === "matchday" ? (todaysFixture ?? nextFixture) : null;

  const value = useMemo<SeasonContextValue>(
    () => ({ phase, matchdayFixture, nextFixture, daysToKickoff, overridePhase, setOverridePhase }),
    [phase, matchdayFixture, nextFixture, daysToKickoff, overridePhase],
  );

  return (
    // display:contents keeps this out of the flex layout in app/layout.tsx —
    // it exists purely to scope `data-season` for the accent-variable CSS
    // (see globals.css), not to affect page structure.
    <div data-season={phase} className="contents">
      <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>
    </div>
  );
}

export function useSeason() {
  const ctx = useContext(SeasonContext);
  if (!ctx) throw new Error("useSeason must be used within a SeasonProvider.");
  return ctx;
}
