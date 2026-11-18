/**
 * Shopping links. We never invent product URLs or store addresses: unless the administrator
 * has saved a verified link/location, these helpers produce clearly labelled SEARCH links.
 */
import type { Gift, GiftRetailer, Retailer, StoreLocation } from "./types";

export function googleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

/** Google Maps URLs API — opens a search (works in the Maps app on phones too). */
export function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Only allow http(s) links to be rendered as hrefs (defends against javascript: URLs). */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export interface OnlineOption {
  kind: "product" | "website" | "search";
  label: string;
  href: string;
  retailer: string | null;
  note: string | null;
  verified: boolean;
}

export interface PhysicalOption {
  kind: "location" | "search";
  label: string;
  retailer: string;
  address: string | null;
  area: string | null;
  phone: string | null;
  href: string;
  verified: boolean;
}

export interface WhereToBuy {
  online: OnlineOption[];
  physical: PhysicalOption[];
  sources: { retailer: string; note: string | null }[];
}

/** A search on the retailer's own website, when we know its (checked) search address. */
export function retailerSearchUrl(r: Pick<Retailer, "search_url_template">, query: string): string | null {
  const t = r.search_url_template;
  if (!t || !t.includes("{q}")) return null;
  return safeHttpUrl(t.replace("{q}", encodeURIComponent(query)));
}

export interface BuyLink {
  href: string;
  retailer: string;
  note: string | null;
  verified: boolean;
}

/** The single best "Buy" link for a gift: a direct product page (checked ones first), if any. */
export function primaryBuyLink(gift: Pick<Gift, "id">, links: GiftRetailer[], retailers: Retailer[]): BuyLink | null {
  const byId = new Map(retailers.map((r) => [r.id, r]));
  const candidates = links
    .filter((l) => l.gift_id === gift.id && safeHttpUrl(l.product_url) && byId.has(l.retailer_id))
    .sort((a, b) => Number(b.url_verified) - Number(a.url_verified) || Number(b.is_primary) - Number(a.is_primary));
  const l = candidates[0];
  if (!l) return null;
  return { href: safeHttpUrl(l.product_url)!, retailer: byId.get(l.retailer_id)!.name, note: l.product_note ?? null, verified: l.url_verified };
}

export function buildWhereToBuy(
  gift: Pick<Gift, "id" | "name">,
  links: GiftRetailer[],
  retailers: Retailer[],
  locations: StoreLocation[],
): WhereToBuy {
  const byId = new Map(retailers.map((r) => [r.id, r]));
  const mine = links
    .filter((l) => l.gift_id === gift.id && byId.has(l.retailer_id))
    .sort(
      (a, b) =>
        Number(Boolean(safeHttpUrl(b.product_url))) - Number(Boolean(safeHttpUrl(a.product_url))) ||
        Number(b.url_verified) - Number(a.url_verified) ||
        Number(b.is_primary) - Number(a.is_primary),
    );

  const online: OnlineOption[] = [];
  const physical: PhysicalOption[] = [];
  const sources: WhereToBuy["sources"] = [];

  for (const link of mine) {
    const r = byId.get(link.retailer_id)!;
    if (link.source_note) sources.push({ retailer: r.name, note: link.source_note });
    const product = safeHttpUrl(link.product_url);
    if (product) {
      online.push({
        kind: "product",
        label: `Buy at ${r.name}`,
        href: product,
        retailer: r.name,
        note: [link.product_note, link.url_verified ? null : "link not yet checked"].filter(Boolean).join(" · ") || "Product page",
        verified: link.url_verified,
      });
    } else {
      const own = retailerSearchUrl(r, gift.name);
      online.push({
        kind: "search",
        label: own ? `Search ${r.name} for it` : `Search for it at ${r.name}`,
        href: own ?? googleSearchUrl(`${gift.name} ${r.name} Uganda`),
        retailer: r.name,
        note: own ? `Opens a search on ${r.name}’s website` : "Google search — no product page saved yet",
        verified: false,
      });
    }

    const locs = locations.filter((l) => l.retailer_id === r.id);
    if (locs.length) {
      for (const l of locs) {
        physical.push({
          kind: "location",
          label: l.name,
          retailer: r.name,
          address: l.address,
          area: l.area,
          phone: l.phone,
          href: safeHttpUrl(l.maps_url) ?? mapsSearchUrl([l.name, l.address ?? l.area ?? "Kampala"].join(" ")),
          verified: l.verified,
        });
      }
    } else if (!physical.some((p) => p.retailer === r.name)) {
      physical.push({
        kind: "search",
        label: `Find ${r.name} on Google Maps`,
        retailer: r.name,
        address: null,
        area: null,
        phone: null,
        href: mapsSearchUrl(`${r.name} Kampala`),
        verified: false,
      });
    }
  }

  // Always offer a general search too.
  online.push({
    kind: "search",
    label: "Search other shops in Uganda",
    href: googleSearchUrl(`${gift.name} buy Uganda`),
    retailer: null,
    note: "Google search",
    verified: false,
  });
  if (!mine.length) {
    physical.push({
      kind: "search",
      label: "Find baby stores in Kampala",
      retailer: "Any baby store",
      address: null,
      area: null,
      phone: null,
      href: mapsSearchUrl("baby store Kampala"),
      verified: false,
    });
  }
  return { online, physical, sources };
}
