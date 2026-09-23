import { redirect } from "next/navigation";

// Discover folded into the Explore tab (bottom-nav restructure) — its
// Trending content lives there now via /explore?view=trending. The
// Nearby/People/Guides tabs built here don't have a home in the new nav;
// this component file (and discover-tabs.tsx etc.) stays on disk, just
// unreachable via any route now that this page only redirects.
export default function DiscoverPage() {
  redirect("/explore?view=trending");
}
