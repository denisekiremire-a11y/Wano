import { describe, expect, it } from "vitest";
import { categories as catSeed, gifts as giftSeed } from "@data/wishlist";
import { applyFilters, DEFAULT_FILTERS } from "@/lib/filters";
import { liveTotals, statusCounts } from "@/lib/totals";
import type { Category, Gift } from "@/lib/types";

// Build in-memory rows equivalent to the database import.
const categories: Category[] = catSeed.map((c, i) => ({
  id: i + 1, slug: c.slug, name: c.name, description: c.description, sort_order: i + 1, doc_budget_aed: c.docBudgetAed, doc_full_aed: c.docFullAed,
}));
const ref = (s: (typeof giftSeed)[number]) =>
  s.salePrice ?? s.price ?? (s.priceMin !== undefined && s.priceMax !== undefined ? Math.round(((s.priceMin + s.priceMax) / 2) * 100) / 100 : null);
const gifts: Gift[] = giftSeed.map((s, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, slug: s.slug, category_id: categories.find((c) => c.slug === s.category)!.id,
  name: s.name, description: s.description, notes: s.notes ?? null, price_aed: s.price ?? null, sale_price_aed: s.salePrice ?? null,
  price_min_aed: s.priceMin ?? null, price_max_aed: s.priceMax ?? null, price_unit: s.priceUnit ?? null, price_basis: s.basis,
  price_label: s.priceLabel, reference_price_aed: ref(s), tier: s.tier, in_doc_budget: s.inDocBudget, in_doc_full: s.inDocFull,
  is_alternative: Boolean(s.isAlternative), is_featured: Boolean(s.featured), image_url: s.image, image_kind: s.imageKind, image_caption: null,
  photo_refs: s.photoRefs ?? null, status: i % 10 === 0 ? "reserved" : i % 13 === 0 ? "purchased" : "available", status_changed_at: "", sort_order: (i + 1) * 10, created_at: "", updated_at: "",
}));

const run = (f: Partial<typeof DEFAULT_FILTERS>) => applyFilters(gifts, { ...DEFAULT_FILTERS, ...f }, { categories });

describe("filters", () => {
  it("returns everything by default", () => expect(run({})).toHaveLength(77));

  it("filters by category", () => {
    expect(run({ category: "travel" })).toHaveLength(7);
    expect(run({ category: "clothing" })).toHaveLength(16);
    expect(run({ category: "does-not-exist" })).toHaveLength(0);
  });

  it("searches name, description and notes, accent-insensitively", () => {
    expect(run({ q: "bjorn" }).map((g) => g.name)).toEqual(["BabyBjörn Bouncer"]);
    expect(run({ q: "momcozy" })).toHaveLength(6);
    expect(run({ q: "  NASAL  " }).map((g) => g.name)).toEqual(["Electric NoseFrida"]);
    expect(run({ q: "zzzz" })).toHaveLength(0);
  });

  it("filters to available gifts only", () => {
    expect(run({ availableOnly: true }).every((g) => g.status === "available")).toBe(true);
  });

  it("filters by price bucket using the reference price", () => {
    const under = run({ price: "under-100" });
    expect(under.length).toBeGreaterThan(0);
    expect(under.every((g) => (g.reference_price_aed ?? Infinity) < 100)).toBe(true);
    expect(run({ price: "1500-plus" }).every((g) => g.reference_price_aed! >= 1500)).toBe(true);
  });

  it("filters budget-friendly and premium options", () => {
    expect(run({ tier: "budget" }).every((g) => g.tier === "budget")).toBe(true);
    expect(run({ tier: "premium" }).map((g) => g.name)).toContain("Kikka Boo Goya Platinum");
  });

  it("sorts by price and name", () => {
    const asc = run({ sort: "price-asc" }).map((g) => g.reference_price_aed!);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = run({ sort: "price-desc" });
    expect(desc[0].name).toBe("Kikka Boo Goya Platinum");
    const names = run({ sort: "name-asc" }).map((g) => g.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
  });
});

describe("totals", () => {
  it("counts statuses", () => {
    const c = statusCounts(gifts);
    expect(c.total).toBe(77);
    expect(c.available + c.reserved + c.purchased).toBe(77);
  });

  it("reconciles the live budget/full totals with the PDF per category where the PDF allows", () => {
    const t = liveTotals(gifts, categories);
    const by = Object.fromEntries(t.byCategory.map((c) => [c.category.slug, c]));
    // Within rounding of the PDF's "~" figures.
    for (const slug of ["travel", "bath-and-changing", "health-and-grooming", "feeding"]) {
      expect(Math.abs(by[slug].liveBudget - by[slug].docBudget!), slug).toBeLessThanOrEqual(5);
      expect(Math.abs(by[slug].liveFull - by[slug].docFull!), slug).toBeLessThanOrEqual(5);
    }
    // Sleep budget differs only because the registry uses the in-store bedside cot price (1,691 vs ~1,353 online).
    expect(by["sleep-and-nursery"].liveBudget - (1691 - 1353)).toBeCloseTo(1871, 0);
    // Alternatives are excluded from every scenario total.
    expect(t.allExcludingAlternatives).toBeLessThan(t.everything);
  });
});
