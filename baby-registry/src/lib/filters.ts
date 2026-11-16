import type { Category, Gift, GiftRetailer, Retailer } from "./types";
import { toNumber } from "./currency";

export type PriceBucket = "all" | "under-100" | "100-500" | "500-1500" | "1500-plus";
export type TierFilter = "all" | "budget" | "premium";
export type SortKey = "recommended" | "price-asc" | "price-desc" | "name-asc" | "name-desc";

export interface Filters {
  q: string;
  category: string; // category slug or "all"
  availableOnly: boolean;
  price: PriceBucket;
  tier: TierFilter;
  sort: SortKey;
}

export const DEFAULT_FILTERS: Filters = {
  q: "",
  category: "all",
  availableOnly: false,
  price: "all",
  tier: "all",
  sort: "recommended",
};

export const PRICE_BUCKETS: { value: PriceBucket; label: string; min: number; max: number }[] = [
  { value: "all", label: "Any price", min: -Infinity, max: Infinity },
  { value: "under-100", label: "Under AED 100", min: -Infinity, max: 100 },
  { value: "100-500", label: "AED 100–500", min: 100, max: 500 },
  { value: "500-1500", label: "AED 500–1,500", min: 500, max: 1500 },
  { value: "1500-plus", label: "AED 1,500+", min: 1500, max: Infinity },
];

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name-asc", label: "Name: A–Z" },
  { value: "name-desc", label: "Name: Z–A" },
];

/** Lower-case and strip accents so "bjorn" finds "BabyBjörn". */
export function normalise(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function inPriceBucket(gift: Pick<Gift, "reference_price_aed">, bucket: PriceBucket): boolean {
  if (bucket === "all") return true;
  const price = toNumber(gift.reference_price_aed);
  if (price === null) return false;
  const b = PRICE_BUCKETS.find((x) => x.value === bucket)!;
  return price >= b.min && price < b.max;
}

export function applyFilters(
  gifts: Gift[],
  f: Filters,
  ctx: { categories: Category[]; retailers?: Retailer[]; giftRetailers?: GiftRetailer[] },
): Gift[] {
  const catBySlug = new Map(ctx.categories.map((c) => [c.slug, c]));
  const catById = new Map(ctx.categories.map((c) => [c.id, c]));
  const retailerNames = new Map((ctx.retailers ?? []).map((r) => [r.id, r.name]));
  const retailersForGift = new Map<string, string[]>();
  for (const l of ctx.giftRetailers ?? []) {
    const name = retailerNames.get(l.retailer_id);
    if (!name) continue;
    retailersForGift.set(l.gift_id, [...(retailersForGift.get(l.gift_id) ?? []), name]);
  }

  const terms = normalise(f.q.trim()).split(/\s+/).filter(Boolean);
  const category = f.category !== "all" ? catBySlug.get(f.category) : undefined;

  const filtered = gifts.filter((g) => {
    if (f.category !== "all" && (!category || g.category_id !== category.id)) return false;
    if (f.availableOnly && g.status !== "available") return false;
    if (!inPriceBucket(g, f.price)) return false;
    if (f.tier === "budget" && g.tier !== "budget") return false;
    if (f.tier === "premium" && g.tier !== "premium") return false;
    if (terms.length) {
      const hay = normalise(
        [g.name, g.description, g.notes, g.price_label, catById.get(g.category_id)?.name, ...(retailersForGift.get(g.id) ?? [])]
          .filter(Boolean)
          .join(" "),
      );
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    return true;
  });

  return sortGifts(filtered, f.sort, catById);
}

export function sortGifts(gifts: Gift[], sort: SortKey, catById?: Map<number, Category>): Gift[] {
  const arr = [...gifts];
  const price = (g: Gift) => toNumber(g.reference_price_aed);
  const byPrice = (dir: 1 | -1) => (a: Gift, b: Gift) => {
    const pa = price(a);
    const pb = price(b);
    if (pa === null && pb === null) return a.name.localeCompare(b.name);
    if (pa === null) return 1; // unpriced always last
    if (pb === null) return -1;
    return (pa - pb) * dir || a.name.localeCompare(b.name);
  };
  switch (sort) {
    case "price-asc":
      return arr.sort(byPrice(1));
    case "price-desc":
      return arr.sort(byPrice(-1));
    case "name-asc":
      return arr.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
    case "name-desc":
      return arr.sort((a, b) => b.name.localeCompare(a.name, "en", { sensitivity: "base" }));
    default:
      return arr.sort(
        (a, b) =>
          (catById?.get(a.category_id)?.sort_order ?? 0) - (catById?.get(b.category_id)?.sort_order ?? 0) ||
          a.sort_order - b.sort_order ||
          a.name.localeCompare(b.name),
      );
  }
}
