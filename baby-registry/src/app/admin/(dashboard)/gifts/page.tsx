import type { Metadata } from "next";
import { GiftsTable } from "@/components/admin/GiftsTable";
import { requireAdmin } from "@/lib/admin";
import { loadAdminCore } from "@/lib/admin-data";

export const metadata: Metadata = { title: "Gifts" };

export default async function AdminGiftsPage() {
  const { supabase } = await requireAdmin();
  const { gifts, categories } = await loadAdminCore(supabase);
  const ordered = [...gifts].sort(
    (a, b) =>
      (categories.find((c) => c.id === a.category_id)?.sort_order ?? 0) - (categories.find((c) => c.id === b.category_id)?.sort_order ?? 0) ||
      a.sort_order - b.sort_order,
  );
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl">Gifts</h1>
        <p className="text-sm text-muted">Add, edit and remove gifts, change prices and availability.</p>
      </div>
      <GiftsTable gifts={ordered} categories={categories} />
    </div>
  );
}
