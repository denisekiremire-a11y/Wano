import { redirect } from "next/navigation";

// Journeys folded into the Explore tab (bottom-nav restructure) — the
// five journeys now show as a horizontal "Curated journeys" row on
// /explore. by-journey-view.tsx's accordion experience stays on disk,
// just unreachable via any route now that this page only redirects.
// /journeys/[slug] (each journey's own detail page) is untouched.
export default function JourneysPage() {
  redirect("/explore?view=all");
}
