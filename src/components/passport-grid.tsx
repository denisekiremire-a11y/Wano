import Link from "next/link";
import { journeyTheme } from "@/lib/journey-theme";

type Progress = {
  journey: { id: string; slug: string; name: string };
  earned: boolean;
  earnedAt: Date | null;
}[];

/** Each stamp reads as a numbered mark rather than an icon-in-a-circle —
 * the journey's own theme color fills an earned stamp, an unearned one
 * stays a dashed ink ring (see .stamp-slot in globals.css) around its
 * number. */
export function PassportGrid({ progress }: { progress: Progress }) {
  return (
    <div className="grid grid-cols-5 gap-3 sm:gap-4">
      {progress.map(({ journey, earned }, i) => {
        const theme = journeyTheme(journey.slug);
        return (
          <Link
            key={journey.id}
            href={`/journeys/${journey.slug}`}
            className="flex flex-col items-center gap-2 text-center"
          >
            <span
              data-earned={earned}
              className={`stamp-slot font-mono-data flex h-14 w-14 items-center justify-center rounded-full text-sm sm:h-16 sm:w-16 ${
                earned ? "text-white" : "bg-ink/5 text-ink/30"
              }`}
              style={earned ? { backgroundColor: theme.hero } : undefined}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-[11px] font-medium leading-tight text-ink/70 sm:text-xs">
              {journey.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
