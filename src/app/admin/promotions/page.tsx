import { redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";

// Deals moved onto the Rewards page (Rewards & Deals, one section each) —
// this route stays only so old links/bookmarks land somewhere real.
export default async function AdminPromotionsPage() {
  await requireAdminPage("/admin/promotions");
  redirect("/admin/rewards");
}
