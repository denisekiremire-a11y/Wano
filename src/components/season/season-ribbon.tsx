"use client";

import Link from "next/link";
import { useSeason } from "@/components/season/season-provider";

const KAMPALA_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Kampala",
  hour: "2-digit",
  minute: "2-digit",
});

const PHASE_STYLE: Record<string, string> = {
  buildup: "bg-forest-900 text-white",
  live: "bg-forest-900 text-white",
  matchday: "bg-red-700 text-white",
  afterglow: "bg-marigold-50 text-forest-800",
};

/** One line, directly under the header — never taller than h-9 regardless
 * of phase, so it never affects the header's own height. Renders nothing
 * in "off", which is the app's default state essentially forever (only
 * ~10 weeks a year, 2027 only, are anything else). */
export function SeasonRibbon() {
  const { phase, matchdayFixture, daysToKickoff } = useSeason();
  if (phase === "off") return null;

  let message: React.ReactNode;
  if (phase === "buildup") {
    message = (
      <>
        AFCON 2027 kicks off in {daysToKickoff} {daysToKickoff === 1 ? "day" : "days"}
      </>
    );
  } else if (phase === "live") {
    message = <>AFCON 2027 is underway — Uganda, Kenya &amp; Tanzania</>;
  } else if (phase === "matchday" && matchdayFixture) {
    message = (
      <>
        Match day — {matchdayFixture.home} vs {matchdayFixture.away} · {matchdayFixture.venue} ·{" "}
        {KAMPALA_TIME.format(matchdayFixture.kickoff)} EAT
      </>
    );
  } else if (phase === "matchday") {
    message = <>Match day at a Uganda venue</>;
  } else {
    message = <>AFCON 2027 has wrapped — Wano&apos;s still here</>;
  }

  return (
    <Link
      href="/afcon"
      className={`sticky top-[6.25rem] z-30 flex h-9 items-center justify-center gap-2 px-4 text-center text-xs font-medium transition-colors ${PHASE_STYLE[phase]}`}
    >
      {phase === "matchday" && (
        <span
          aria-hidden
          className="h-2 w-2 flex-none animate-pulse rounded-full bg-white motion-reduce:animate-none"
        />
      )}
      <span className="truncate">{message}</span>
    </Link>
  );
}
