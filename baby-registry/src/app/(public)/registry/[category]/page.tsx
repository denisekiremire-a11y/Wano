import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CategoryGrid } from "@/components/registry/CategoryGrid";
import { RegistryBrowser } from "@/components/registry/RegistryBrowser";
import { CurrencyNote, PriceNotice } from "@/components/site/Notices";
import { getRegistry } from "@/lib/registry-cache";

type Params = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params;
  try {
    const { categories } = await getRegistry();
    const c = categories.find((x) => x.slug === category);
    return { title: c ? c.name : "Category" };
  } catch {
    return { title: "Category" };
  }
}

export default async function CategoryPage({ params }: Params) {
  const [{ category: slug }, { categories, settings }] = await Promise.all([params, getRegistry()]);
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link href="/registry" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All gifts
      </Link>
      <p className="eyebrow mt-5">Category</p>
      <h1 className="mt-1 text-4xl sm:text-5xl">{category.name}</h1>
      {category.description && <p className="mt-3 max-w-2xl text-ink-soft">{category.description}</p>}
      <div className="mt-6">
        <CategoryGrid active={category.slug} />
      </div>
      <div className="mt-6 space-y-2">
        <PriceNotice settings={settings} compact />
        <CurrencyNote settings={settings} />
      </div>
      <div className="mt-6">
        <RegistryBrowser key={category.slug} fixedCategory={category.slug} />
      </div>
    </main>
  );
}
