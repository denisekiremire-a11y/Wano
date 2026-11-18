import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { gifts, retailers as seedRetailers } from "@data/wishlist";
import { productLinks, retailerExtras } from "@data/product-links";
import { buildLinksSql } from "../../scripts/generate-links-sql";
import { buildWhereToBuy, primaryBuyLink, retailerSearchUrl } from "@/lib/links";
import type { GiftRetailer, Retailer } from "@/lib/types";

describe("direct product links data", () => {
  const giftSlugs = new Set(gifts.map((g) => g.slug));
  const retailerSlugs = new Set([...seedRetailers.map((r) => r.slug), ...retailerExtras.map((r) => r.slug)]);

  it("every link points at a real gift and a known shop, over https, once per gift", () => {
    for (const l of productLinks) {
      expect(giftSlugs.has(l.gift), l.gift).toBe(true);
      expect(retailerSlugs.has(l.retailer), l.retailer).toBe(true);
      expect(l.url).toMatch(/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}\//);
      expect(l.note.length).toBeGreaterThan(3);
    }
    expect(new Set(productLinks.map((l) => l.gift)).size).toBe(productLinks.length);
  });

  it("only links that could not be opened are marked unchecked", () => {
    expect(productLinks.filter((l) => !l.verified).map((l) => l.gift).sort()).toEqual(["eufy-baby-monitor-e21", "momcozy-kleanpal-pro"]);
  });

  it("retailer search templates are https and contain {q}", () => {
    for (const r of retailerExtras) if (r.searchUrlTemplate) expect(r.searchUrlTemplate).toMatch(/^https:\/\/.*\{q\}/);
  });

  it("the committed migration matches the data file", () => {
    const committed = readFileSync(join(__dirname, "..", "..", "supabase", "migrations", "20261117000200_product_links_and_peaches.sql"), "utf8");
    expect(committed).toBe(buildLinksSql());
  });
});

describe("buy links", () => {
  const retailers: Retailer[] = [
    { id: 1, slug: "mom-store", name: "Mom Store", website_url: null, search_url_template: "https://www.momstore.com/ae-en/catalogsearch/result/?q={q}", phone: null, notes: null },
    { id: 2, slug: "carrefour-uae", name: "Carrefour UAE", website_url: null, search_url_template: null, phone: null, notes: null },
  ];
  const link = (p: Partial<GiftRetailer>): GiftRetailer => ({ id: Math.random().toString(), gift_id: "g", retailer_id: 1, product_url: null, url_verified: false, source_note: null, is_primary: false, ...p });

  it("prefers a checked product link for the Buy button", () => {
    const links = [
      link({ retailer_id: 2, product_url: "https://www.carrefouruae.com/p/1", url_verified: false, is_primary: true }),
      link({ retailer_id: 1, product_url: "https://www.momstore.com/ae-en/item/", url_verified: true, product_note: "Exact item" }),
    ];
    expect(primaryBuyLink({ id: "g" }, links, retailers)).toEqual({ href: "https://www.momstore.com/ae-en/item/", retailer: "Mom Store", note: "Exact item", verified: true });
    expect(primaryBuyLink({ id: "other" }, links, retailers)).toBeNull();
  });

  it("puts product links first and labels unchecked ones", () => {
    const w = buildWhereToBuy({ id: "g", name: "Thing" }, [link({ retailer_id: 1 }), link({ retailer_id: 2, product_url: "https://www.carrefouruae.com/p/1", product_note: "Thing, White" })], retailers, []);
    expect(w.online[0]).toMatchObject({ kind: "product", label: "Buy at Carrefour UAE", note: "Thing, White · link not yet checked" });
  });

  it("uses the shop's own search page when there is no product link", () => {
    expect(retailerSearchUrl(retailers[0], "MAM Feel Good")).toBe("https://www.momstore.com/ae-en/catalogsearch/result/?q=MAM%20Feel%20Good");
    const w = buildWhereToBuy({ id: "g", name: "MAM Feel Good" }, [link({ retailer_id: 1 })], retailers, []);
    expect(w.online[0]).toMatchObject({ kind: "search", label: "Search Mom Store for it", href: "https://www.momstore.com/ae-en/catalogsearch/result/?q=MAM%20Feel%20Good" });
    expect(retailerSearchUrl({ search_url_template: "javascript:{q}" }, "x")).toBeNull();
  });
});
