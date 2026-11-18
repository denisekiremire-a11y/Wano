import { describe, expect, it } from "vitest";
import { aedToUgx, CURRENCY, formatPrice, formatUGX, isValidRate } from "@/lib/currency";
import { priceView } from "@/lib/pricing";
import type { Gift } from "@/lib/types";

const g = (p: Partial<Gift>): Gift =>
  ({ price_aed: null, sale_price_aed: null, price_min_aed: null, price_max_aed: null, price_unit: null, price_basis: "estimate", reference_price_aed: null, ...p }) as Gift;

describe("currency", () => {
  it("the registry is priced in UGX only (Peekaboo Uganda), with whole shillings", () => {
    expect(CURRENCY).toBe("UGX");
    expect(formatPrice(1006800)).toBe("UGX 1,006,800");
    expect(formatPrice("14400.00")).toBe("UGX 14,400");
    expect(formatPrice(null)).toBe("—");
  });

  it("returns no UGX until a valid rate is configured", () => {
    expect(aedToUgx(100, null)).toBeNull();
    expect(aedToUgx(100, 0)).toBeNull();
    expect(aedToUgx(100, -5)).toBeNull();
    expect(formatUGX(100, undefined)).toBeNull();
    expect(isValidRate(null)).toBe(false);
  });

  it("converts with the configured rate, rounded to the nearest 100 UGX", () => {
    expect(aedToUgx(100, 1000)).toBe(100000);
    expect(aedToUgx(3199, 987.65)).toBe(3159500); // 3,159,492.35 → 3,159,500
    expect(formatUGX(1, 1000)).toBe("UGX 1,000");
    expect(aedToUgx("250", "1000")).toBe(250000);
  });
});

describe("priceView", () => {
  it("shows a single price in UGX, with no second currency", () => {
    const v = priceView(g({ price_aed: 1006800, price_basis: "online" }));
    expect(v.aed).toBe("UGX 1,006,800");
    expect(v.ugx).toBeNull();
    expect(v.isRange).toBe(false);
  });

  it("shows sale with the original price struck through", () => {
    const v = priceView(g({ price_aed: 249900, sale_price_aed: 187400 }));
    expect(v.aed).toBe("UGX 187,400");
    expect(v.wasAed).toBe("UGX 249,900");
    expect(v.isSale).toBe(true);
    expect(v.ugx).toBeNull();
  });

  it("shows ranges as ranges, never a single invented figure", () => {
    const v = priceView(g({ price_min_aed: 40000, price_max_aed: 60000 }));
    expect(v.aed).toBe("UGX 40,000–60,000");
    expect(v.ugx).toBeNull();
    expect(v.isRange).toBe(true);
  });

  it("handles missing prices", () => {
    expect(priceView(g({})).aed).toBe("Price to be confirmed");
  });
});
