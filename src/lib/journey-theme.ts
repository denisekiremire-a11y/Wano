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
  /** Real photo for card art / hero banners. Falls back to the illustrated
   * JourneyArt + solid hero color where there's no good matching photo yet. */
  image?: string;
};

const themes: Record<JourneySlug, JourneyTheme> = {
  "adrenaline-on-the-nile": {
    // Rapids Blue — surging river rapids & raw power
    hero: "#1B6FB5",
    tagBg: "#EBF4FB",
    buttonText: "#ffffff",
    image: "/images/riverside-adventure.jpg",
  },
  "big-five-safari": {
    // Sunset Orange — dramatic savanna sundown & heat
    hero: "#E65C24",
    tagBg: "#FDF0EB",
    buttonText: "#ffffff",
    // No matching safari/wildlife photo in the asset set yet — keeps the
    // illustrated art + solid color treatment.
  },
  "kampala-city-experience": {
    // Night Purple — royal heritage & vibrant nightlife
    hero: "#723B8C",
    tagBg: "#F4ECF8",
    buttonText: "#ffffff",
    image: "/images/rooftop-friends.jpg",
  },
  "gorilla-trekking": {
    // Bwindi Green — highland rainforest & misty bamboo
    hero: "#2A6849",
    tagBg: "#EAF2ED",
    buttonText: "#ffffff",
    image: "/images/rwenzori-foothills.jpg",
  },
  "relax-unwind": {
    // Lakeside Peach — Lake Victoria dusk & slow mornings (lighter hue,
    // needs dark text for contrast where the other four use white)
    hero: "#D88268",
    tagBg: "#FAECE8",
    buttonText: "#1e150e",
    image: "/images/lake-victoria-reeds.jpg",
  },
};

export function journeyTheme(slug: string): JourneyTheme {
  return themes[slug as JourneySlug] ?? themes["relax-unwind"];
}
