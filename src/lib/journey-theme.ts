export type JourneySlug =
  | "relax-unwind"
  | "adrenaline-on-the-nile"
  | "big-five-safari"
  | "gorilla-trekking"
  | "kampala-city-experience";

type JourneyTheme = {
  gradient: string;
  chip: string;
  accentText: string;
};

const themes: Record<JourneySlug, JourneyTheme> = {
  "relax-unwind": {
    gradient: "from-nile-700 via-nile-500 to-forest-400",
    chip: "bg-nile-100 text-nile-800",
    accentText: "text-nile-700",
  },
  "adrenaline-on-the-nile": {
    gradient: "from-forest-900 via-nile-700 to-marigold-500",
    chip: "bg-marigold-100 text-marigold-800",
    accentText: "text-marigold-700",
  },
  "big-five-safari": {
    gradient: "from-marigold-700 via-marigold-500 to-forest-600",
    chip: "bg-forest-100 text-forest-800",
    accentText: "text-forest-700",
  },
  "gorilla-trekking": {
    gradient: "from-forest-950 via-forest-700 to-forest-400",
    chip: "bg-forest-100 text-forest-800",
    accentText: "text-forest-700",
  },
  "kampala-city-experience": {
    gradient: "from-nile-900 via-forest-700 to-marigold-400",
    chip: "bg-nile-100 text-nile-800",
    accentText: "text-nile-700",
  },
};

export function journeyTheme(slug: string): JourneyTheme {
  return themes[slug as JourneySlug] ?? themes["relax-unwind"];
}
