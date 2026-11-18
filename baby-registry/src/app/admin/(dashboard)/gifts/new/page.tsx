import type { Metadata } from "next";
import Link from "next/link";
import { GiftForm } from "@/components/admin/GiftForm";
import { requireAdmin } from "@/lib/admin";
import { loadAdminCore } from "@/lib/admin-data";
import { supabasePublicKey, supabaseUrl } from "@/lib/env";

export const metadata: Metadata = { title: "Add gift" };

export default async function NewGiftPage() {
  const { supabase } = await requireAdmin();
  const { categories } = await loadAdminCore(supabase);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/admin/gifts" className="text-sm text-muted hover:text-ink">
        ← All gifts
      </Link>
      <h1 className="text-4xl">Add a gift</h1>
      <GiftForm categories={categories} supabaseUrl={supabaseUrl()!} supabaseKey={supabasePublicKey()!} />
    </div>
  );
}
