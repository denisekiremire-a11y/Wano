import type { Metadata } from "next";
import { RetailersManager } from "@/components/admin/RetailersManager";
import { requireAdmin } from "@/lib/admin";
import type { Retailer, StoreLocation } from "@/lib/types";

export const metadata: Metadata = { title: "Shops" };

export default async function RetailersPage() {
  const { supabase } = await requireAdmin();
  const [r, l, links] = await Promise.all([
    supabase.from("retailers").select("*").order("name"),
    supabase.from("store_locations").select("*").order("name"),
    supabase.from("gift_retailers").select("retailer_id"),
  ]);
  const counts: Record<number, number> = {};
  for (const x of links.data ?? []) counts[x.retailer_id] = (counts[x.retailer_id] ?? 0) + 1;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-4xl">Shops</h1>
        <p className="text-sm text-muted">
          Only add websites, addresses and phone numbers you have checked. Anything left blank is replaced for guests by clearly labelled
          search links.
        </p>
      </div>
      <RetailersManager retailers={(r.data ?? []) as Retailer[]} locations={(l.data ?? []) as StoreLocation[]} linkCounts={counts} />
    </div>
  );
}
