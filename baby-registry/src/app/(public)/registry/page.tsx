import type { Metadata } from "next";
import { CategoryGrid } from "@/components/registry/CategoryGrid";
import { RegistryBrowser } from "@/components/registry/RegistryBrowser";
import { CurrencyNote, PriceNotice } from "@/components/site/Notices";
import { getRegistry } from "@/lib/registry-cache";

export const metadata: Metadata = { title: "Full wishlist" };

export default async function RegistryPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const [{ settings }, sp] = await Promise.all([getRegistry(), searchParams]);
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="eyebrow">The wishlist</p>
      <h1 className="mt-1 text-4xl sm:text-5xl">Every gift on the list</h1>
      <div className="mt-6">
        <CategoryGrid />
      </div>
      <div className="mt-6 space-y-2">
        <PriceNotice settings={settings} />
        <CurrencyNote />
      </div>
      <div className="mt-6">
        <RegistryBrowser initialQuery={q} />
      </div>
    </main>
  );
}
