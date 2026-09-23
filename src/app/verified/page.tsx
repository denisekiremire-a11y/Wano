import { redirect } from "next/navigation";

// Verified folded into the Explore tab (bottom-nav restructure) as the
// "Wano Verified · deals" toggle chip — it was never a separate trust
// filter (searchListings() already only returns trusted-vendor listings);
// its real differentiator, "has a live discount/freebie," now lives at
// /explore?verified=1.
export default function VerifiedPage() {
  redirect("/explore?verified=1");
}
