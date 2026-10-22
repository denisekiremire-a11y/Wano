import type { getTrailProgressForTraveller } from "@/lib/data/trails";

/** Trails render alongside the journey stamp grid, but with their own
 * shape — a trail has no fixed theme color or slug page, and "done" needs
 * a progress count rather than just a filled/unfilled ring. */
export function TrailStamps({ rows }: { rows: Awaited<ReturnType<typeof getTrailProgressForTraveller>> }) {
  if (rows.length === 0) return null;

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {rows.map(({ trail, visitedCount, totalCount, completed }) => (
        <div
          key={trail.id}
          className={`border p-4 ${completed ? "border-ember bg-ember/5" : "border-ink/10 bg-white"}`}
        >
          <p className="eyebrow text-ember">{completed ? "Completed" : "Trail"}</p>
          <p className="font-serif-editorial mt-1 text-lg text-ink">{trail.name}</p>
          {trail.description && <p className="mt-1 text-xs text-ink/60">{trail.description}</p>}
          <div className="mt-3 h-[3px] w-full bg-ink/10">
            <div
              className="h-full bg-ember transition-all"
              style={{ width: totalCount > 0 ? `${Math.round((visitedCount / totalCount) * 100)}%` : "0%" }}
            />
          </div>
          <p className="font-mono-data mt-1.5 text-xs text-ink/60">
            {visitedCount} of {totalCount} {totalCount === 1 ? "listing" : "listings"} visited
            {completed ? ` · +${trail.bonusXp} XP earned` : ` · +${trail.bonusXp} bonus XP`}
          </p>
        </div>
      ))}
    </div>
  );
}
