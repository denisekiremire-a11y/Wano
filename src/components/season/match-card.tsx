"use client";

import { useRouter } from "next/navigation";
import { useAnchor } from "@/components/afcon/anchor-provider";
import { useSeason } from "@/components/season/season-provider";

const KAMPALA_DATETIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Kampala",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** The next fixture at a Uganda venue — its one job is the button: setting
 * the anchor context to that venue and sending the traveller to Journeys,
 * turning "there's a match" into "here's a trip". Hidden in "off" and
 * "afterglow" per spec — a match card with nothing live or upcoming to
 * anchor against isn't useful, it's just clutter. */
export function MatchCard() {
  const { phase, matchdayFixture, nextFixture } = useSeason();
  const { setStadiumAnchor } = useAnchor();
  const router = useRouter();

  if (phase === "off" || phase === "afterglow") return null;
  const fixture = matchdayFixture ?? nextFixture;
  if (!fixture) return null;

  function handlePlanTrip() {
    setStadiumAnchor(fixture!.venueId);
    router.push("/journeys");
  }

  return (
    <div className="rounded-2xl border border-forest-900/10 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-marigold-700">{fixture.stage}</p>
      <p className="mt-1 font-display text-lg font-semibold text-forest-900">
        {fixture.home} <span className="text-forest-800/40">vs</span> {fixture.away}
      </p>
      <p className="mt-1 text-sm text-forest-800/70">
        {KAMPALA_DATETIME.format(fixture.kickoff)} EAT · {fixture.venue}
      </p>
      <button
        type="button"
        onClick={handlePlanTrip}
        className="mt-4 rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-700"
      >
        Plan a trip around this match →
      </button>
    </div>
  );
}
