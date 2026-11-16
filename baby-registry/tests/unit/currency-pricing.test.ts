import { describe, expect, it } from "vitest";
import { aedToUgx, formatAED, formatUGX, isValidRate } from "@/lib/currency";
import { priceView } from "@/lib/pricing";
import type { Gift } from "@/lib/types";

const g = (p: Partial<Gift>): Gift =>
  ({ price_aed: null, sale_price_aed: null, price_min_aed: null, price_max_aed: null, price_unit: null, price_basis: "estimate", reference_price_aed: null, ...p }) as Gift;

describe("currency", () => {
  it("formats AED without spurious decimals", () => {
    expect(formatAED(3199)).toBe("AED 3,199");
    expect(formatAED(169.5)).toBe("AED 169.50");
    expect(formatAED(null)).toBe("—");
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
  it("shows a single price in both currencies", () => {
    const v = priceView(g({ price_aed: 3199, price_basis: "shelf_tag" }), 1000);
    expect(v.aed).toBe("AED 3,199");
    expect(v.ugx).toBe("UGX 3,199,000");
    expect(v.isRange).toBe(false);
  });

  it("shows sale with the original price struck through", () => {
    const v = priceView(g({ price_aed: 2499, sale_price_aed: 1874 }), null);
    expect(v.aed).toBe("AED 1,874");
    expect(v.wasAed).toBe("AED 2,499");
    expect(v.isSale).toBe(true);
    expect(v.ugx).toBeNull();
  });

  it("shows ranges as ranges, never a single invented figure", () => {
    const v = priceView(g({ price_min_aed: 800, price_max_aed: 1500 }), 1000);
    expect(v.aed).toBe("AED 800–1,500");
    expect(v.ugx).toBe("UGX 800,000–1,500,000");
    expect(v.isRange).toBe(true);
  });

  it("handles missing prices", () => {
    expect(priceView(g({}), 1000).aed).toBe("Price to be confirmed");
  });
});
