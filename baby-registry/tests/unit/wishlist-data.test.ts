import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { categories, gifts, DOC_BUDGET_TOTAL_AED, DOC_FULL_TOTAL_AED, PRICES_RECORDED_ON } from "@data/wishlist";
import { buildSql } from "../../scripts/generate-seed";
import { readFileSync } from "node:fs";

/** Row counts per table in Baby_List.pdf (pages 3–10). */
const PDF_ROWS: Record<string, string[]> = {
  travel: ["Doona+ (Grey Hound)", "Kikka Boo Goya Platinum", "Carrycot / pram (display)", "Bugaboo compact stroller", "Cybex Cloud T i-Size", "Cybex Base T", "Cybex Sirona T i-Size"],
  "sleep-and-nursery": ["Maxi-Cosi Iora Air", "Bugaboo Stardust", "Wave 3-in-1 Cot", "Wave chest of drawers", "Strips cot bed", "Kenva dresser", "Pluto dresser", "BabyBjörn Bouncer", "4moms mamaRoo", "eufy Baby Monitor E21", "HelloBaby HB6338", "Lulujo muslin swaddles", "ClevaSleep swaddle", "Cleva Mama 3-in-1 romper"],
  "bath-and-changing": ["Stokke Flexi Bath + support", "Stokke Flexi Bath Stand", "Luma bath set", "Skip Hop Moby", "Carter's wash cloths", "Carter's hooded towels", "Kikka Boo hooded towel", "Cuddledry", "Grey changing tray", "Contoured changing pad"],
  "health-and-grooming": ["Kikka Boo grooming set", "Electric NoseFrida", "Frida Flake Fixer", "Frida freezer teether", "Frida Electric Nail Buffer"],
  feeding: ["MAM Easy Start starter set", "MAM Newborn Essentials", "MAM Feel Good", "MAM pacifiers", "MAM cups", "Matchstick Monkey", "Silicone feeding sets"],
  clothing: ["Dinosaur sleepsuit", "Ribbed bodysuits", "Lamb set", "Leopard & kitten set", "Cardigan & dress set", "Sage & cream sets", "Palm-print sleepsuits", "Dungarees", "Trousers / shorts", "Mixed bodysuit sets", "Hats", "Socks", "Shoes & bows", "Scratch mittens", "Bibs", "Blankets"],
  "extras-and-inspiration": ["Momcozy bottle warmer", "Momcozy portable warmer", "Momcozy KleanPal Pro", "Momcozy food maker", "Momcozy S12 Pro pump", "Momcozy wipe warmer", "Forehead thermometer", "Duck bath thermometer", "Twistshake bath + stand", "Nursery glider", "Sound machine", "Play gym", "High chair", "Silicone feeding set", "Diaper bag", "Bath time essentials", "Knit romper set", "Plush teddy"],
};

describe("import from Baby_List.pdf", () => {
  it("keeps the seven original categories in order", () => {
    expect(categories.map((c) => c.name)).toEqual([
      "Travel",
      "Sleep & nursery",
      "Bath & changing",
      "Health & grooming",
      "Feeding",
      "Clothing",
      "Extras & inspiration",
    ]);
  });

  it("imports every product and alternative from the PDF — 77 rows, none missing or extra", () => {
    expect(gifts).toHaveLength(77);
    for (const [cat, names] of Object.entries(PDF_ROWS)) {
      expect(gifts.filter((g) => g.category === cat).map((g) => g.name)).toEqual(names);
    }
  });

  it("has unique slugs", () => {
    expect(new Set(gifts.map((g) => g.slug)).size).toBe(gifts.length);
  });

  it("never invents an exact price for a range", () => {
    for (const g of gifts) {
      if (/[0-9]\s*[–-]\s*[0-9]/.test(g.priceLabel) && !g.salePrice) {
        expect(g.price, g.name).toBeUndefined();
        expect(g.priceMin, g.name).toBeDefined();
        expect(g.priceMax, g.name).toBeDefined();
      }
    }
  });

  it("labels every 'est.' price as an estimate, and no estimate as confirmed", () => {
    for (const g of gifts) {
      if (g.priceLabel.includes("est.")) expect(g.basis, g.name).toBe("estimate");
      if (g.priceLabel.includes("online") && !g.priceLabel.includes("in store")) expect(g.basis, g.name).toBe("online");
    }
  });

  it("preserves the verbatim price text from the PDF", () => {
    const byName = new Map(gifts.map((g) => [g.name, g]));
    expect(byName.get("Maxi-Cosi Iora Air")!.priceLabel).toBe("1,691 in store · ~1,353 online");
    expect(byName.get("Wave 3-in-1 Cot")!.priceLabel).toBe("was 2,499 · now 1,874");
    expect(byName.get("Ribbed bodysuits")!.priceLabel).toBe("~119 / 4-pack (83)");
    expect(byName.get("Momcozy food maker")!.priceLabel).toBe("from ~139; est. up to 350");
  });

  it("marks exactly the PDF's alternatives as alternatives", () => {
    expect(gifts.filter((g) => g.isAlternative).map((g) => g.name).sort()).toEqual(
      ["Bugaboo compact stroller", "Cybex Sirona T i-Size", "Bugaboo Stardust", "BabyBjörn Bouncer", "Luma bath set", "Strips cot bed", "Kenva dresser", "Pluto dresser"].sort(),
    );
    for (const g of gifts.filter((x) => x.isAlternative)) {
      expect(g.inDocBudget || g.inDocFull, g.name).toBe(false);
    }
  });

  it("keeps the original document's totals and date", () => {
    expect(DOC_BUDGET_TOTAL_AED).toBe(7860);
    expect(DOC_FULL_TOTAL_AED).toBe(25500);
    expect(categories.reduce((a, c) => a + c.docBudgetAed, 0)).toBe(7860);
    expect(categories.reduce((a, c) => a + c.docFullAed, 0)).toBe(25500 - 0 /* PDF rows sum to 25,500 */);
    expect(PRICES_RECORDED_ON).toBe("2026-10-24");
  });

  it("has an image file on disk for every product, with honest provenance", () => {
    for (const g of gifts) {
      expect(existsSync(join(__dirname, "..", "..", "public", g.image)), g.image).toBe(true);
      if (g.category === "extras-and-inspiration") expect(g.imageKind).toBe("inspiration");
      else expect(g.imageKind).toBe("store_photo");
    }
  });

  it("the committed import migration matches the data file", () => {
    const committed = readFileSync(join(__dirname, "..", "..", "supabase", "migrations", "20261116000200_import_wishlist.sql"), "utf8");
    expect(committed).toBe(buildSql());
  });
});
