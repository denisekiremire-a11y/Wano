"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { applyFilters, DEFAULT_FILTERS, PRICE_BUCKETS, SORT_OPTIONS, type Filters, type PriceBucket, type SortKey, type TierFilter } from "@/lib/filters";
import { GiftCard } from "./GiftCard";
import { useRegistry } from "./context";

interface Props {
  /** When set, the browser is locked to one category (category pages). */
  fixedCategory?: string;
  initialQuery?: string;
  headingId?: string;
}

const TIERS: { value: TierFilter; label: string }[] = [
  { value: "all", label: "All options" },
  { value: "budget", label: "Budget-friendly" },
  { value: "premium", label: "Premium picks" },
];

export function RegistryBrowser({ fixedCategory, initialQuery = "", headingId }: Props) {
  const { gifts, categories, retailers, giftRetailers } = useRegistry();
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS, q: initialQuery, category: fixedCategory ?? "all" });
  const deferredQ = useDeferredValue(filters.q);

  const results = useMemo(
    () => applyFilters(gifts, { ...filters, q: deferredQ }, { categories, retailers, giftRetailers }),
    [gifts, filters, deferredQ, categories, retailers, giftRetailers],
  );

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const isFiltered =
    filters.q !== "" ||
    filters.availableOnly ||
    filters.price !== "all" ||
    filters.tier !== "all" ||
    (!fixedCategory && filters.category !== "all");
  const reset = () => setFilters({ ...DEFAULT_FILTERS, category: fixedCategory ?? "all" });

  return (
    <div>
      <div className="card space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search gifts</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={filters.q}
              onChange={(e) => set("q", e.target.value)}
              placeholder="Search gifts, brands or shops…"
              className="field-input pl-10"
              data-testid="search-input"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="price-filter">
              Price range
            </label>
            <select
              id="price-filter"
              className="field-input w-auto py-2 text-sm"
              value={filters.price}
              onChange={(e) => set("price", e.target.value as PriceBucket)}
              data-testid="price-filter"
            >
              {PRICE_BUCKETS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="sort">
              Sort
            </label>
            <select
              id="sort"
              className="field-input w-auto py-2 text-sm"
              value={filters.sort}
              onChange={(e) => set("sort", e.target.value as SortKey)}
              data-testid="sort-select"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!fixedCategory && (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]" role="group" aria-label="Category">
            <button type="button" className={filters.category === "all" ? "chip-on" : "chip-off"} onClick={() => set("category", "all")}>
              All categories
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                type="button"
                className={filters.category === c.slug ? "chip-on" : "chip-off"}
                onClick={() => set("category", c.slug)}
                data-testid={`category-chip-${c.slug}`}
                aria-pressed={filters.category === c.slug}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="size-4 text-muted" aria-hidden />
          <button
            type="button"
            className={filters.availableOnly ? "chip-on" : "chip-off"}
            onClick={() => set("availableOnly", !filters.availableOnly)}
            aria-pressed={filters.availableOnly}
            data-testid="available-only"
          >
            Available only
          </button>
          {TIERS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={filters.tier === t.value ? "chip-on" : "chip-off"}
              onClick={() => set("tier", t.value)}
              aria-pressed={filters.tier === t.value}
              data-testid={`tier-${t.value}`}
            >
              {t.label}
            </button>
          ))}
          {isFiltered && (
            <button type="button" className="btn-ghost ml-auto px-3 py-1.5 text-sm" onClick={reset}>
              <X className="size-4" aria-hidden /> Clear filters
            </button>
          )}
        </div>
      </div>

      <p className="mt-5 text-sm text-muted" aria-live="polite" id={headingId} data-testid="result-count">
        Showing {results.length} of {fixedCategory ? gifts.filter((g) => categories.find((c) => c.slug === fixedCategory)?.id === g.category_id).length : gifts.length} gifts
      </p>

      {results.length === 0 ? (
        <div className="card mt-4 flex flex-col items-center px-6 py-14 text-center" data-testid="empty-state">
          <Search className="size-8 text-sand" strokeWidth={1.25} aria-hidden />
          <p className="mt-3 font-display text-2xl">No gifts match those filters</p>
          <p className="mt-1 text-sm text-muted">Try a different search or clear the filters to see everything.</p>
          {isFiltered && (
            <button type="button" className="btn-secondary mt-5" onClick={reset}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((g) => (
            <GiftCard key={g.id} gift={g} />
          ))}
        </div>
      )}
    </div>
  );
}
