import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GiftForm } from "@/components/admin/GiftForm";
import { GiftRetailersEditor } from "@/components/admin/GiftRetailersEditor";
import { requireAdmin } from "@/lib/admin";
import { loadAdminCore } from "@/lib/admin-data";
import { supabasePublicKey, supabaseUrl } from "@/lib/env";
import type { GiftRetailer, Retailer } from "@/lib/types";

export const metadata: Metadata = { title: "Edit gift" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> };

export default async function EditGiftPage({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ gifts, categories }, links, retailers] = await Promise.all([
    loadAdminCore(supabase),
    supabase.from("gift_retailers").select("*").eq("gift_id", id),
    supabase.from("retailers").select("*").order("name"),
  ]);
  const gift = gifts.find((g) => g.id === id);
  if (!gift) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/admin/gifts" className="text-sm text-muted hover:text-ink">
        ← All gifts
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-4xl">{gift.name}</h1>
        <Link href={`/gift/${gift.slug}`} target="_blank" className="text-sm text-sage-700 hover:underline">
          View on the registry ↗
        </Link>
      </div>
      {sp.created === "1" && <p className="rounded-xl bg-sage-50 p-3 text-sm text-sage-800">Gift created. You can now add shopping links below.</p>}
      <GiftForm gift={gift} categories={categories} supabaseUrl={supabaseUrl()!} supabaseKey={supabasePublicKey()!} />
      <GiftRetailersEditor giftId={gift.id} links={(links.data ?? []) as GiftRetailer[]} retailers={(retailers.data ?? []) as Retailer[]} />
    </div>
  );
}
