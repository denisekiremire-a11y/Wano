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
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS, availableOnly: true, q: initialQuery, category: fixedCategory ?? "all" });
  const [moreOpen, setMoreOpen] = useState(false);
  const deferredQ = useDeferredValue(filters.q);

  const results = useMemo(
    () => applyFilters(gifts, { ...filters, q: deferredQ }, { categories, retailers, giftRetailers }),
    [gifts, filters, deferredQ, categories, retailers, giftRetailers],
  );

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const isFiltered =
    filters.q !== "" ||
    filters.price !== "all" ||
    filters.tier !== "all" ||
    (!fixedCategory && filters.category !== "all");
  const reset = () => setFilters((f) => ({ ...DEFAULT_FILTERS, availableOnly: f.availableOnly, category: fixedCategory ?? "all" }));
  const extraFilters = (filters.price !== "all" ? 1 : 0) + (filters.tier !== "all" ? 1 : 0) + (filters.sort !== "recommended" ? 1 : 0);
  const inScope = fixedCategory ? gifts.filter((g) => categories.find((c) => c.slug === fixedCategory)?.id === g.category_id) : gifts;
  const availableCount = inScope.filter((g) => g.status === "available").length;

  return (
    <div>
      <div className="card space-y-3 p-3 sm:p-4">
        <label className="relative block">
          <span className="sr-only">Search gifts</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={filters.q}
            onChange={(e) => set("q", e.target.value)}
            placeholder="Search, e.g. “bath”, “monitor”, “stroller”"
            className="field-input py-3 pl-12 text-base"
            data-testid="search-input"
          />
        </label>

        {!fixedCategory && (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]" role="group" aria-label="Category">
            <button type="button" className={filters.category === "all" ? "chip-on" : "chip-off"} onClick={() => set("category", "all")} aria-pressed={filters.category === "all"}>
              Everything
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
          <div className="inline-flex rounded-full border border-linen bg-white p-0.5 text-sm" role="group" aria-label="Which gifts to show">
            <button
              type="button"
              className={`rounded-full px-3.5 py-1.5 ${filters.availableOnly ? "bg-sage-700 text-white" : "text-ink-soft"}`}
              onClick={() => set("availableOnly", true)}
              aria-pressed={filters.availableOnly}
              data-testid="available-only"
            >
              Still available
            </button>
            <button
              type="button"
              className={`rounded-full px-3.5 py-1.5 ${!filters.availableOnly ? "bg-sage-700 text-white" : "text-ink-soft"}`}
              onClick={() => set("availableOnly", false)}
              aria-pressed={!filters.availableOnly}
              data-testid="show-all"
            >
              All gifts
            </button>
          </div>
          <button
            type="button"
            className="btn-ghost px-3 py-1.5 text-sm"
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
            data-testid="more-filters"
          >
            <SlidersHorizontal className="size-4" aria-hidden /> More filters{extraFilters ? ` (${extraFilters})` : ""}
          </button>
          {isFiltered && (
            <button type="button" className="btn-ghost ml-auto px-3 py-1.5 text-sm" onClick={reset}>
              <X className="size-4" aria-hidden /> Clear
            </button>
          )}
        </div>

        {moreOpen && (
          <div className="grid gap-3 rounded-2xl bg-cream/60 p-3 sm:grid-cols-3" data-testid="more-filters-panel">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-muted">Price</span>
              <select className="field-input py-2 text-sm" value={filters.price} onChange={(e) => set("price", e.target.value as PriceBucket)} data-testid="price-filter">
                {PRICE_BUCKETS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-muted">Type of option</span>
              <select className="field-input py-2 text-sm" value={filters.tier} onChange={(e) => set("tier", e.target.value as TierFilter)} data-testid="tier-filter">
                {TIERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-muted">Sort by</span>
              <select className="field-input py-2 text-sm" value={filters.sort} onChange={(e) => set("sort", e.target.value as SortKey)} data-testid="sort-select">
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      <p className="mt-5 text-sm text-muted" aria-live="polite" id={headingId} data-testid="result-count">
        {filters.availableOnly
          ? `${results.length} ${results.length === 1 ? "gift" : "gifts"} still available`
          : `Showing ${results.length} of ${inScope.length} gifts`}
        {filters.availableOnly && availableCount < inScope.length ? ` · ${inScope.length - availableCount} already chosen` : ""}
      </p>

      {results.length === 0 ? (
        <div className="card mt-4 flex flex-col items-center px-6 py-14 text-center" data-testid="empty-state">
          <Search className="size-8 text-sand" strokeWidth={1.25} aria-hidden />
          <p className="mt-3 font-display text-2xl">{filters.availableOnly && !isFiltered ? "Every gift here has been chosen" : "No gifts match"}</p>
          <p className="mt-1 text-sm text-muted">
            {filters.availableOnly && !isFiltered ? "Thank you! Tap “All gifts” to see the full list." : "Try a different search, or clear the filters."}
          </p>
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
