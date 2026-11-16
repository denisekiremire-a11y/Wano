"use client";

import Link from "next/link";
import { Bath, Baby, Car, HeartPulse, Moon, Shirt, Sparkles, Utensils, type LucideIcon } from "lucide-react";
import { useRegistry } from "./context";

const ICONS: Record<string, LucideIcon> = {
  travel: Car,
  "sleep-and-nursery": Moon,
  "bath-and-changing": Bath,
  "health-and-grooming": HeartPulse,
  feeding: Utensils,
  clothing: Shirt,
  "extras-and-inspiration": Sparkles,
};

export function CategoryGrid({ active }: { active?: string }) {
  const { categories, gifts } = useRegistry();
  return (
    <nav aria-label="Categories" className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {categories.map((c) => {
        const Icon = ICONS[c.slug] ?? Baby;
        const inCat = gifts.filter((g) => g.category_id === c.id);
        const available = inCat.filter((g) => g.status === "available").length;
        const isActive = active === c.slug;
        return (
          <Link
            key={c.slug}
            href={`/registry/${c.slug}`}
            className={`group flex flex-col gap-3 rounded-2xl border p-4 transition-colors ${isActive ? "border-sage-600 bg-sage-50" : "border-linen bg-white hover:border-sand"}`}
            aria-current={isActive ? "page" : undefined}
            data-testid={`category-link-${c.slug}`}
          >
            <span className={`flex size-9 items-center justify-center rounded-full ${isActive ? "bg-sage-700 text-white" : "bg-cream text-sage-700"}`}>
              <Icon className="size-[18px]" strokeWidth={1.5} aria-hidden />
            </span>
            <span>
              <span className="block font-medium leading-tight text-ink">{c.name}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {available} of {inCat.length} available
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
