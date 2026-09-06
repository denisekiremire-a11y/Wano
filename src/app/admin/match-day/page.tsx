import { getMatchesForAdmin } from "@/lib/data/xp";
import { getActiveRewardsBySource } from "@/lib/data/rewards";
import { MatchForm } from "./match-form";
import { MatchRow } from "./match-row";

export default async function AdminMatchDayPage() {
  const [matches, prizePool] = await Promise.all([getMatchesForAdmin(), getActiveRewardsBySource("xp_draw")]);

  const prizeOptions = prizePool.map((r) => ({
    id: r.id,
    title: r.title,
    targetTitle: r.target?.title ?? "Unknown",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Match Day</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Wano XP seats — 50 per match, hard cap. Every confirmed booking is one entry in that
          match&apos;s prize draw.
        </p>
      </div>

      <MatchForm />

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-forest-900">Matches</h2>
        {matches.length === 0 ? (
          <p className="text-sm text-forest-800/60">No matches yet — add one above.</p>
        ) : (
          matches.map(({ match, seatsTaken, confirmedCount, draw }) => (
            <MatchRow
              key={match.id}
              matchId={match.id}
              title={match.title}
              location={match.location}
              startAt={match.startAt.toISOString()}
              seatsTaken={seatsTaken}
              confirmedCount={confirmedCount}
              drawWinnerName={draw?.winner?.displayName ?? null}
              drawPrizeTitle={draw?.draw.prizeTitle ?? null}
              prizeOptions={prizeOptions}
            />
          ))
        )}
      </section>
    </div>
  );
}
