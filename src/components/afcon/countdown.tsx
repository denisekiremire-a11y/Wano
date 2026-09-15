"use client";

import { useEffect, useState } from "react";
import { AFCON_KICKOFF } from "@/lib/afcon/anchors";

type TimeLeft = { days: number; hours: number; minutes: number } | "started";

function computeTimeLeft(): TimeLeft {
  const ms = AFCON_KICKOFF.getTime() - Date.now();
  if (ms <= 0) return "started";
  const totalMinutes = Math.floor(ms / 60_000);
  return {
    days: Math.floor(totalMinutes / (60 * 24)),
    hours: Math.floor((totalMinutes % (60 * 24)) / 60),
    minutes: totalMinutes % 60,
  };
}

const UPDATE_INTERVAL_MS = 30_000;

/** Client-only by construction: the countdown is computed from Date.now(),
 * which the server and client can never agree on byte-for-byte, so this
 * renders a stable placeholder until the first client tick lands (avoiding
 * an SSR/hydration mismatch) rather than attempting to compute it eagerly. */
export function AfconCountdown() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(computeTimeLeft()), UPDATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  if (!timeLeft) {
    return (
      <span className="inline-flex gap-1.5 font-mono text-sm text-white/50" aria-hidden>
        —d —h —m
      </span>
    );
  }

  if (timeLeft === "started") {
    return <span className="text-sm font-semibold text-ember">Kickoff is here 🎉</span>;
  }

  return (
    <span className="inline-flex items-baseline gap-1.5 font-mono text-sm text-white" role="timer" aria-live="off">
      <span>
        <strong className="text-base">{timeLeft.days}</strong>d
      </span>
      <span>
        <strong className="text-base">{timeLeft.hours}</strong>h
      </span>
      <span>
        <strong className="text-base">{timeLeft.minutes}</strong>m
      </span>
      <span className="text-white/60">to kickoff</span>
    </span>
  );
}
