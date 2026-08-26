import Link from "next/link";
import { StampIcon } from "@/components/icons";
import { journeyTheme } from "@/lib/journey-theme";

type Progress = {
  journey: { id: string; slug: string; name: string };
  earned: boolean;
  earnedAt: Date | null;
}[];

export function PassportGrid({ progress }: { progress: Progress }) {
  return (
    <div className="grid grid-cols-5 gap-3 sm:gap-4">
      {progress.map(({ journey, earned }) => {
        const theme = journeyTheme(journey.slug);
        return (
          <Link
            key={journey.id}
            href={`/journeys/${journey.slug}`}
            className="flex flex-col items-center gap-2 text-center"
          >
            <span
              data-earned={earned}
              className={`stamp-slot flex h-14 w-14 items-center justify-center rounded-full sm:h-16 sm:w-16 ${
                earned ? `bg-gradient-to-br ${theme.gradient} text-white` : "bg-forest-50 text-forest-300"
              }`}
            >
              <StampIcon className="h-6 w-6" />
            </span>
            <span className="text-[11px] font-medium leading-tight text-forest-800/80 sm:text-xs">
              {journey.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
