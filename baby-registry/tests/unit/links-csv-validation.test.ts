import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";
import { buildWhereToBuy, mapsSearchUrl, safeHttpUrl } from "@/lib/links";
import { cleanText, giftSchema, rateSchema, reservationSchema } from "@/lib/validation";
import type { GiftRetailer, Retailer, StoreLocation } from "@/lib/types";

const retailers: Retailer[] = [{ id: 1, slug: "mom-store", name: "Mom Store", website_url: null, phone: null, notes: null }];
const gift = { id: "g1", name: "Doona+ (Grey Hound)" };

describe("where to buy", () => {
  it("never invents a product URL — falls back to clearly labelled searches", () => {
    const links: GiftRetailer[] = [{ id: "l1", gift_id: "g1", retailer_id: 1, product_url: null, url_verified: false, source_note: "Shortlisted in store", is_primary: true }];
    const w = buildWhereToBuy(gift, links, retailers, []);
    expect(w.online.every((o) => o.kind === "search")).toBe(true);
    expect(w.online[0].href).toBe("https://www.google.com/search?q=Doona%2B%20(Grey%20Hound)%20Mom%20Store%20UAE");
    expect(w.physical[0]).toMatchObject({ kind: "search", href: "https://www.google.com/maps/search/?api=1&query=Mom%20Store%20Dubai" });
  });

  it("uses verified links and store locations when the admin adds them", () => {
    const links: GiftRetailer[] = [{ id: "l1", gift_id: "g1", retailer_id: 1, product_url: "https://shop.example/doona", url_verified: true, source_note: null, is_primary: true }];
    const locs: StoreLocation[] = [{ id: "s1", retailer_id: 1, name: "Mom Store – Example Mall", area: "Example Mall", address: "Unit 1", phone: "+971 4 000 0000", maps_url: null, verified: true }];
    const w = buildWhereToBuy(gift, links, retailers, locs);
    expect(w.online[0]).toMatchObject({ kind: "product", href: "https://shop.example/doona", verified: true });
    expect(w.physical[0]).toMatchObject({ kind: "location", address: "Unit 1", verified: true });
  });

  it("offers general searches when no retailer is known", () => {
    const w = buildWhereToBuy({ id: "g2", name: "Play gym" }, [], retailers, []);
    expect(w.online).toHaveLength(1);
    expect(w.physical[0].href).toBe(mapsSearchUrl("baby store Dubai"));
  });

  it("refuses non-http(s) links", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,x")).toBeNull();
    expect(safeHttpUrl("https://ok.example/")).toBe("https://ok.example/");
  });
});

describe("csv", () => {
  it("quotes and neutralises spreadsheet formulas from guest input", () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell("+1 555")).toBe("'+1 555");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell(12)).toBe("12");
    expect(toCsv([{ a: "x" }], [{ header: "A", value: (r) => r.a }])).toBe("﻿A\r\nx\r\n");
  });
});

describe("validation", () => {
  const base = { giftId: "6f1c1f3a-1d2b-4c5d-8e9f-0a1b2c3d4e5f", name: "  Aunt   Grace ", email: "", phone: "", message: "", confirm: "yes" };

  it("accepts a minimal reservation and normalises it", () => {
    const r = reservationSchema.parse(base);
    expect(r).toMatchObject({ name: "Aunt Grace", email: null, phone: null, message: null });
  });

  it("requires a name and explicit confirmation", () => {
    expect(reservationSchema.safeParse({ ...base, name: " " }).success).toBe(false);
    expect(reservationSchema.safeParse({ ...base, confirm: "" }).success).toBe(false);
  });

  it("rejects bad optional contact details", () => {
    expect(reservationSchema.safeParse({ ...base, email: "nope" }).success).toBe(false);
    expect(reservationSchema.safeParse({ ...base, phone: "call me" }).success).toBe(false);
    expect(reservationSchema.safeParse({ ...base, email: "a@b.co", phone: "+256 700 000000" }).success).toBe(true);
  });

  it("strips markup and control characters", () => {
    expect(cleanText("<script>hi</script>\u0007", 100)).toBe("script hi /script");
  });

  it("validates gift prices and ranges", () => {
    const ok = { name: "X", slug: "x", categoryId: "1", priceBasis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true, isAlternative: false, isFeatured: false, imageKind: "placeholder" };
    expect(giftSchema.safeParse({ ...ok, priceMinAed: "1,000", priceMaxAed: "1,400" }).success).toBe(true);
    expect(giftSchema.safeParse({ ...ok, priceMinAed: "500", priceMaxAed: "100" }).success).toBe(false);
    expect(giftSchema.safeParse({ ...ok, priceAed: "-5" }).success).toBe(false);
    expect(giftSchema.safeParse({ ...ok, imageUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  it("validates the exchange rate", () => {
    expect(rateSchema.parse({ rate: "1,012.5", source: "" })).toEqual({ rate: 1012.5, source: null });
    expect(rateSchema.parse({ rate: "", source: "" }).rate).toBeNull();
    expect(rateSchema.safeParse({ rate: "0" }).success).toBe(false);
  });
});
