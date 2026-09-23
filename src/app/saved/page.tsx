import { redirect } from "next/navigation";

// Saved folded into the Passport tab (bottom-nav restructure) as its
// "Saved" sub-tab, reusing this page's exact data-fetching.
export default function SavedPage() {
  redirect("/passport?tab=saved");
}
