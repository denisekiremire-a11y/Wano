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

export function buildWhereToBuy(
  gift: Pick<Gift, "id" | "name">,
  links: GiftRetailer[],
  retailers: Retailer[],
  locations: StoreLocation[],
): WhereToBuy {
  const byId = new Map(retailers.map((r) => [r.id, r]));
  const mine = links
    .filter((l) => l.gift_id === gift.id && byId.has(l.retailer_id))
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary));

  const online: OnlineOption[] = [];
  const physical: PhysicalOption[] = [];
  const sources: WhereToBuy["sources"] = [];

  for (const link of mine) {
    const r = byId.get(link.retailer_id)!;
    sources.push({ retailer: r.name, note: link.source_note });
    const product = safeHttpUrl(link.product_url);
    if (product) {
      online.push({
        kind: "product",
        label: `Shop online at ${r.name}`,
        href: product,
        retailer: r.name,
        note: link.url_verified ? "Direct product link" : "Product link added by the family",
        verified: link.url_verified,
      });
    } else {
      online.push({
        kind: "search",
        label: `Search for it at ${r.name}`,
        href: googleSearchUrl(`${gift.name} ${r.name} UAE`),
        retailer: r.name,
        note: "Google search — no direct product link saved yet",
        verified: false,
      });
    }
    const site = safeHttpUrl(r.website_url);
    if (site && !product) {
      online.push({ kind: "website", label: `Visit ${r.name} website`, href: site, retailer: r.name, note: "Retailer website", verified: true });
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
          href: safeHttpUrl(l.maps_url) ?? mapsSearchUrl([l.name, l.address ?? l.area ?? "Dubai"].join(" ")),
          verified: l.verified,
        });
      }
    } else {
      physical.push({
        kind: "search",
        label: `Find ${r.name} stores in Dubai`,
        retailer: r.name,
        address: null,
        area: null,
        phone: null,
        href: mapsSearchUrl(`${r.name} Dubai`),
        verified: false,
      });
    }
  }

  // Always offer a general search too.
  online.push({
    kind: "search",
    label: "Search online in the UAE",
    href: googleSearchUrl(`${gift.name} buy UAE`),
    retailer: null,
    note: "Google search",
    verified: false,
  });
  if (!mine.length) {
    physical.push({
      kind: "search",
      label: "Find baby stores in Dubai",
      retailer: "Any baby store",
      address: null,
      area: null,
      phone: null,
      href: mapsSearchUrl("baby store Dubai"),
      verified: false,
    });
  }
  return { online, physical, sources };
}
