export type JourneySlug =
  | "relax-unwind"
  | "adrenaline-on-the-nile"
  | "big-five-safari"
  | "gorilla-trekking"
  | "kampala-city-experience";

type JourneyTheme = {
  /** Hero color — journey card art, hero banners, buttons, price/accent text. */
  hero: string;
  /** Light tint used behind the hero color for badges/chips. */
  tagBg: string;
  /** Text color for buttons whose background is `hero` (contrast varies by hue). */
  buttonText: string;
};

const themes: Record<JourneySlug, JourneyTheme> = {
  "adrenaline-on-the-nile": {
    // Rapids Blue — surging river rapids & raw power
    hero: "#1B6FB5",
    tagBg: "#EBF4FB",
    buttonText: "#ffffff",
  },
  "big-five-safari": {
    // Sunset Orange — dramatic savanna sundown & heat
    hero: "#E65C24",
    tagBg: "#FDF0EB",
    buttonText: "#ffffff",
  },
  "kampala-city-experience": {
    // Night Purple — royal heritage & vibrant nightlife
    hero: "#723B8C",
    tagBg: "#F4ECF8",
    buttonText: "#ffffff",
  },
  "gorilla-trekking": {
    // Bwindi Green — highland rainforest & misty bamboo
    hero: "#2A6849",
    tagBg: "#EAF2ED",
    buttonText: "#ffffff",
  },
  "relax-unwind": {
    // Lakeside Peach — Lake Victoria dusk & slow mornings (lighter hue,
    // needs dark text for contrast where the other four use white)
    hero: "#D88268",
    tagBg: "#FAECE8",
    buttonText: "#1e150e",
  },
};

export function journeyTheme(slug: string): JourneyTheme {
  return themes[slug as JourneySlug] ?? themes["relax-unwind"];
}
