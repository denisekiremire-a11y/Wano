/**
 * Source of truth for the import from Baby_List.pdf ("Our shortlist from Mom Store & Carter's",
 * Dubai, 24 October 2026). Every row in the PDF's seven tables is here — 77 options, including
 * alternatives. `priceLabel` is the price text exactly as printed; numeric fields are parsed
 * from it without rounding or inventing values:
 *   - a single figure            → price
 *   - "was X · now Y" / "(Y)"    → price + salePrice
 *   - a range "A–B"              → priceMin / priceMax (never collapsed to one invented price)
 *   - basis: un-prefixed figures are shelf tags as photographed, "online" figures are from UAE
 *     retailers, "est." figures are estimates (the PDF's own legend).
 *
 * inDocBudget / inDocFull record which items make up the PDF's two scenario totals. The PDF does
 * not list them item by item; they were reconstructed from its per-category subtotals (see
 * docs/DATA_NOTES.md). isAlternative marks the items the PDF explicitly excludes from both totals.
 */

export type PriceBasis = "shelf_tag" | "online" | "estimate";
export type Tier = "budget" | "standard" | "premium";
export type ImageKind = "store_photo" | "inspiration" | "uploaded" | "placeholder";

export interface CategorySeed {
  slug: string;
  name: string;
  description: string | null;
  docBudgetAed: number;
  docFullAed: number;
}

export interface RetailerSeed {
  slug: string;
  name: string;
  notes: string;
}

export interface GiftSeed {
  slug: string;
  category: string;
  name: string;
  description: string;
  priceLabel: string;
  price?: number;
  salePrice?: number;
  priceMin?: number;
  priceMax?: number;
  priceUnit?: string;
  basis: PriceBasis;
  tier: Tier;
  inDocBudget: boolean;
  inDocFull: boolean;
  isAlternative?: boolean;
  featured?: boolean;
  image: string;
  imageKind: ImageKind;
  photoRefs?: string;
  notes?: string;
  retailers: { slug: string; note: string; primary?: boolean }[];
}

export const PRICES_RECORDED_ON = "2026-10-24";
export const DOC_BUDGET_TOTAL_AED = 7860;
export const DOC_FULL_TOTAL_AED = 25500;
export const DOC_TOTALS_NOTE =
  "Budget uses the cheaper option for each need, e.g. the Doona+ as car seat and stroller in one, the bedside cot bought online, and sale prices on clothes. Full wishlist takes the premium picks in each section plus every extra from the inspiration pictures. Estimates use the middle of each range. Not counted in either total, because they are alternatives to items already included: Bugaboo stroller, Cybex Sirona T, Bugaboo travel cot, BabyBjörn bouncer, Luma bath, and the Strips cot, Kenva and Pluto dressers.";

export const categories: CategorySeed[] = [
  {
    slug: "travel",
    name: "Travel",
    description:
      "Two routes for the car seat: Doona+ alone (3,199) is car seat and stroller in one, or Cybex Cloud T + Base T (2,608) with a separate stroller.",
    docBudgetAed: 3200,
    docFullAed: 6610,
  },
  {
    slug: "sleep-and-nursery",
    name: "Sleep & nursery",
    description: "Nursery furniture was 25% off on the day.",
    docBudgetAed: 1870,
    docFullAed: 7780,
  },
  { slug: "bath-and-changing", name: "Bath & changing", description: null, docBudgetAed: 690, docFullAed: 1500 },
  { slug: "health-and-grooming", name: "Health & grooming", description: null, docBudgetAed: 170, docFullAed: 740 },
  { slug: "feeding", name: "Feeding", description: null, docBudgetAed: 170, docFullAed: 620 },
  {
    slug: "clothing",
    name: "Clothing",
    description: "All Carter's. Carter's UAE had 30% off online when checked; sale price shown in brackets.",
    docBudgetAed: 570,
    docFullAed: 1450,
  },
  {
    slug: "extras-and-inspiration",
    name: "Extras & inspiration",
    description:
      "From the inspiration pictures. Momcozy prices from Carrefour UAE / Centrepoint; the rest are estimates. Monitor and stroller are covered above.",
    docBudgetAed: 1190,
    docFullAed: 6800,
  },
];

export const retailers: RetailerSeed[] = [
  { slug: "mom-store", name: "Mom Store", notes: "Named in the original list: “Our shortlist from Mom Store & Carter's”. Most in-store photos were taken here." },
  { slug: "carters", name: "Carter's", notes: "Named in the original list. Carter's UAE had 30% off online when checked." },
  { slug: "carrefour-uae", name: "Carrefour UAE", notes: "Source of the Momcozy online prices in the original list." },
  { slug: "centrepoint", name: "Centrepoint", notes: "Source of the Momcozy online prices in the original list." },
];

const MOM_STORE_PHOTO = { slug: "mom-store", note: "Shortlisted in store (Mom Store)", primary: true };
const MOM_STORE_ONLINE = { slug: "mom-store", note: "Shortlisted in store (Mom Store); online price from a UAE retailer", primary: true };
const CARTERS = { slug: "carters", note: "Carter's (photographed in store; online sale price from Carter's UAE)", primary: true };
const CARTERS_STORE = { slug: "carters", note: "Carter's (photographed in store)", primary: true };
const MOMCOZY = [
  { slug: "carrefour-uae", note: "Momcozy price from Carrefour UAE / Centrepoint", primary: true },
  { slug: "centrepoint", note: "Momcozy price from Carrefour UAE / Centrepoint" },
];

const p = (n: string) => `/gifts/${n}.jpg`;

export const gifts: GiftSeed[] = [
  // ───────────────────────────── Travel ─────────────────────────────
  {
    slug: "doona-plus-grey-hound", category: "travel", name: "Doona+ (Grey Hound)",
    description: "Car seat that folds out into a stroller; accessories extra",
    priceLabel: "3,199", price: 3199, basis: "shelf_tag", tier: "budget", inDocBudget: true, inDocFull: false, featured: true,
    image: p("9192"), imageKind: "store_photo", photoRefs: "9192–9195", retailers: [MOM_STORE_PHOTO],
    notes: "Car seat and stroller in one — the budget route for travel.",
  },
  {
    slug: "kikka-boo-goya-platinum", category: "travel", name: "Kikka Boo Goya Platinum",
    description: "2-in-1 stroller (seat + carrycot) with changing bag",
    priceLabel: "3,999", price: 3999, basis: "shelf_tag", tier: "premium", inDocBudget: false, inDocFull: true,
    image: p("9198"), imageKind: "store_photo", photoRefs: "9198", retailers: [MOM_STORE_PHOTO],
  },
  {
    slug: "carrycot-pram-display", category: "travel", name: "Carrycot / pram (display)",
    description: "Black carrycot",
    priceLabel: "est. 800–1,500", priceMin: 800, priceMax: 1500, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: false,
    image: p("9199"), imageKind: "store_photo", photoRefs: "9199", retailers: [MOM_STORE_PHOTO],
    notes: "Display model; brand not identified in the original list. Not counted in either of the original document's totals.",
  },
  {
    slug: "bugaboo-compact-stroller", category: "travel", name: "Bugaboo compact stroller",
    description: "Lightweight fold-up stroller",
    priceLabel: "~2,899 (tag partly hidden)", price: 2899, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: false, isAlternative: true,
    image: p("9200"), imageKind: "store_photo", photoRefs: "9200–9202", retailers: [MOM_STORE_PHOTO],
    notes: "Price read from a partly hidden shelf tag, so it is approximate. Listed as an alternative in the original document.",
  },
  {
    slug: "cybex-cloud-t-i-size", category: "travel", name: "Cybex Cloud T i-Size",
    description: "Infant car seat",
    priceLabel: "1,309", price: 1309, basis: "shelf_tag", tier: "premium", inDocBudget: false, inDocFull: true,
    image: p("9205"), imageKind: "store_photo", photoRefs: "9205–9206", retailers: [MOM_STORE_PHOTO],
    notes: "Pairs with the Cybex Base T (Cloud T + Base T = AED 2,608) and a separate stroller.",
  },
  {
    slug: "cybex-base-t", category: "travel", name: "Cybex Base T",
    description: "Isofix base for the Cloud T",
    priceLabel: "1,299", price: 1299, basis: "shelf_tag", tier: "premium", inDocBudget: false, inDocFull: true,
    image: p("9206"), imageKind: "store_photo", photoRefs: "9205–9206", retailers: [MOM_STORE_PHOTO],
  },
  {
    slug: "cybex-sirona-t-i-size", category: "travel", name: "Cybex Sirona T i-Size",
    description: "Rotating car seat, birth to ~4 years",
    priceLabel: "est. 1,800–1,900", priceMin: 1800, priceMax: 1900, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: false, isAlternative: true,
    image: p("9203"), imageKind: "store_photo", photoRefs: "9203–9204", retailers: [MOM_STORE_PHOTO],
    notes: "Listed as an alternative in the original document.",
  },

  // ───────────────────────── Sleep & nursery ─────────────────────────
  {
    slug: "maxi-cosi-iora-air", category: "sleep-and-nursery", name: "Maxi-Cosi Iora Air",
    description: "Bedside cot",
    priceLabel: "1,691 in store · ~1,353 online", price: 1691, basis: "shelf_tag", tier: "budget", inDocBudget: true, inDocFull: true, featured: true,
    image: p("9207"), imageKind: "store_photo", photoRefs: "9207–9210", retailers: [MOM_STORE_PHOTO],
    notes: "AED 1,691 in store; about AED 1,353 online. The original budget total assumed buying it online.",
  },
  {
    slug: "bugaboo-stardust", category: "sleep-and-nursery", name: "Bugaboo Stardust",
    description: "Travel cot / play yard",
    priceLabel: "1,699", price: 1699, basis: "shelf_tag", tier: "standard", inDocBudget: false, inDocFull: false, isAlternative: true,
    image: p("9211"), imageKind: "store_photo", photoRefs: "9211", retailers: [MOM_STORE_PHOTO],
    notes: "Listed as an alternative in the original document (Bugaboo travel cot).",
  },
  {
    slug: "wave-3-in-1-cot", category: "sleep-and-nursery", name: "Wave 3-in-1 Cot",
    description: "Converts as baby grows",
    priceLabel: "was 2,499 · now 1,874", price: 2499, salePrice: 1874, basis: "shelf_tag", tier: "premium", inDocBudget: false, inDocFull: true, featured: true,
    image: p("9212"), imageKind: "store_photo", photoRefs: "9212–9213", retailers: [MOM_STORE_PHOTO],
    notes: "25% off on the day the list was made.",
  },
  {
    slug: "wave-chest-of-drawers", category: "sleep-and-nursery", name: "Wave chest of drawers",
    description: "Matches the Wave cot",
    priceLabel: "was 2,299 · now 1,724", price: 2299, salePrice: 1724, basis: "shelf_tag", tier: "premium", inDocBudget: false, inDocFull: true,
    image: p("9213"), imageKind: "store_photo", photoRefs: "9212–9213", retailers: [MOM_STORE_PHOTO],
    notes: "25% off on the day the list was made.",
  },
  {
    slug: "strips-cot-bed", category: "sleep-and-nursery", name: "Strips cot bed",
    description: "White and wood",
    priceLabel: "was 1,999 · now 1,499", price: 1999, salePrice: 1499, basis: "shelf_tag", tier: "standard", inDocBudget: false, inDocFull: false, isAlternative: true,
    image: p("9215"), imageKind: "store_photo", photoRefs: "9215", retailers: [MOM_STORE_PHOTO],
    notes: "Listed as an alternative in the original document.",
  },
  {
    slug: "kenva-dresser", category: "sleep-and-nursery", name: "Kenva dresser",
    description: "Wooden dresser / changing station",
    priceLabel: "was 2,499 · now 1,874", price: 2499, salePrice: 1874, basis: "shelf_tag", tier: "standard", inDocBudget: false, inDocFull: false, isAlternative: true,
    image: p("9214"), imageKind: "store_photo", photoRefs: "9214, 9247", retailers: [MOM_STORE_PHOTO],
    notes: "Listed as an alternative in the original document.",
  },
  {
    slug: "pluto-dresser", category: "sleep-and-nursery", name: "Pluto dresser",
    description: "White dresser with changing tray",
    priceLabel: "est. 1,700–2,300", priceMin: 1700, priceMax: 2300, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: false, isAlternative: true,
    image: p("9245"), imageKind: "store_photo", photoRefs: "9245", retailers: [MOM_STORE_PHOTO],
    notes: "Listed as an alternative in the original document.",
  },
  {
    slug: "babybjorn-bouncer", category: "sleep-and-nursery", name: "BabyBjörn Bouncer",
    description: "Bouncer seat",
    priceLabel: "1,499", price: 1499, basis: "shelf_tag", tier: "standard", inDocBudget: false, inDocFull: false, isAlternative: true,
    image: p("9209"), imageKind: "store_photo", photoRefs: "9209", retailers: [MOM_STORE_PHOTO],
    notes: "Listed as an alternative in the original document.",
  },
  {
    slug: "4moms-mamaroo", category: "sleep-and-nursery", name: "4moms mamaRoo",
    description: "Electric rocker / swing",
    priceLabel: "1,349 (sale)", salePrice: 1349, basis: "shelf_tag", tier: "premium", inDocBudget: false, inDocFull: true,
    image: p("9250"), imageKind: "store_photo", photoRefs: "9250–9251", retailers: [MOM_STORE_PHOTO],
    notes: "Sale price on the day; the original price was not recorded.",
  },
  {
    slug: "eufy-baby-monitor-e21", category: "sleep-and-nursery", name: "eufy Baby Monitor E21",
    description: "4K camera + parent screen + app",
    priceLabel: "~749–799 online", priceMin: 749, priceMax: 799, basis: "online", tier: "premium", inDocBudget: false, inDocFull: true, featured: true,
    image: p("9238"), imageKind: "store_photo", photoRefs: "9238–9239", retailers: [MOM_STORE_ONLINE],
  },
  {
    slug: "hellobaby-hb6338", category: "sleep-and-nursery", name: "HelloBaby HB6338",
    description: "Video monitor, 3.2\" screen",
    priceLabel: "est. 250–350", priceMin: 250, priceMax: 350, basis: "estimate", tier: "budget", inDocBudget: true, inDocFull: false,
    image: p("9238"), imageKind: "store_photo", photoRefs: "9238", retailers: [MOM_STORE_PHOTO],
    notes: "Budget alternative to the eufy monitor. The shelf photo shows HelloBaby boxes below the eufy display.",
  },
  {
    slug: "lulujo-muslin-swaddles", category: "sleep-and-nursery", name: "Lulujo muslin swaddles",
    description: "2-pack cotton muslin",
    priceLabel: "~129 online", price: 129, basis: "online", tier: "budget", inDocBudget: true, inDocFull: true,
    image: p("9240"), imageKind: "store_photo", photoRefs: "9240–9242", retailers: [MOM_STORE_ONLINE],
  },
  {
    slug: "clevasleep-swaddle", category: "sleep-and-nursery", name: "ClevaSleep swaddle",
    description: "Cleva Mama, 0–3 months",
    priceLabel: "~89 online", price: 89, basis: "online", tier: "budget", inDocBudget: true, inDocFull: true,
    image: p("9243"), imageKind: "store_photo", photoRefs: "9243–9244", retailers: [MOM_STORE_ONLINE],
  },
  {
    slug: "cleva-mama-3-in-1-romper", category: "sleep-and-nursery", name: "Cleva Mama 3-in-1 romper",
    description: "Swaddle that becomes a romper",
    priceLabel: "est. 100–150", priceMin: 100, priceMax: 150, basis: "estimate", tier: "premium", inDocBudget: false, inDocFull: true,
    image: p("9244"), imageKind: "store_photo", photoRefs: "9243–9244", retailers: [MOM_STORE_PHOTO],
  },

  // ───────────────────────── Bath & changing ─────────────────────────
  {
    slug: "stokke-flexi-bath-support", category: "bath-and-changing", name: "Stokke Flexi Bath + support",
    description: "Foldable bath with newborn insert",
    priceLabel: "~299–331 online", priceMin: 299, priceMax: 331, basis: "online", tier: "premium", inDocBudget: false, inDocFull: true, featured: true,
    image: p("9216"), imageKind: "store_photo", photoRefs: "9216", retailers: [MOM_STORE_ONLINE],
  },
  {
    slug: "stokke-flexi-bath-stand", category: "bath-and-changing", name: "Stokke Flexi Bath Stand",
    description: "Stand only",
    priceLabel: "359", price: 359, basis: "shelf_tag", tier: "premium", inDocBudget: false, inDocFull: true,
    image: p("9217"), imageKind: "store_photo", photoRefs: "9217", retailers: [MOM_STORE_PHOTO],
  },
  {
    slug: "luma-bath-set", category: "bath-and-changing", name: "Luma bath set",
    description: "Stand + tub + seat",
    priceLabel: "549", price: 549, basis: "shelf_tag", tier: "standard", inDocBudget: false, inDocFull: false, isAlternative: true,
    image: p("9218"), imageKind: "store_photo", photoRefs: "9218", retailers: [MOM_STORE_PHOTO],
    notes: "Listed as an alternative in the original document.",
  },
  {
    slug: "skip-hop-moby", category: "bath-and-changing", name: "Skip Hop Moby",
    description: "3-stage tub",
    priceLabel: "~299 online", price: 299, basis: "online", tier: "budget", inDocBudget: true, inDocFull: false,
    image: p("9219"), imageKind: "store_photo", photoRefs: "9219", retailers: [MOM_STORE_ONLINE],
  },
  {
    slug: "carters-wash-cloths", category: "bath-and-changing", name: "Carter's wash cloths",
    description: "6-pack",
    priceLabel: "99", price: 99, priceUnit: "6-pack", basis: "shelf_tag", tier: "budget", inDocBudget: true, inDocFull: true,
    image: p("9220"), imageKind: "store_photo", photoRefs: "9220", retailers: [CARTERS_STORE],
  },
  {
    slug: "carters-hooded-towels", category: "bath-and-changing", name: "Carter's hooded towels",
    description: "Towel sets",
    priceLabel: "est. 60–100", priceMin: 60, priceMax: 100, basis: "estimate", tier: "premium", inDocBudget: false, inDocFull: true,
    image: p("9221"), imageKind: "store_photo", photoRefs: "9221", retailers: [CARTERS_STORE],
  },
  {
    slug: "kikka-boo-hooded-towel", category: "bath-and-changing", name: "Kikka Boo hooded towel",
    description: "Soft cotton",
    priceLabel: "est. 50–80", priceMin: 50, priceMax: 80, basis: "estimate", tier: "budget", inDocBudget: true, inDocFull: false,
    image: p("9222"), imageKind: "store_photo", photoRefs: "9222–9223", retailers: [MOM_STORE_PHOTO],
  },
  {
    slug: "cuddledry", category: "bath-and-changing", name: "Cuddledry",
    description: "Hands-free bamboo bath towel",
    priceLabel: "~225 online", price: 225, basis: "online", tier: "premium", inDocBudget: false, inDocFull: true, featured: true,
    image: p("9224"), imageKind: "store_photo", photoRefs: "9224", retailers: [MOM_STORE_ONLINE],
  },
  {
    slug: "grey-changing-tray", category: "bath-and-changing", name: "Grey changing tray",
    description: "Sits on a dresser",
    priceLabel: "est. 150–250", priceMin: 150, priceMax: 250, basis: "estimate", tier: "premium", inDocBudget: false, inDocFull: true,
    image: p("9246"), imageKind: "store_photo", photoRefs: "9245–9246", retailers: [MOM_STORE_PHOTO],
  },
  {
    slug: "contoured-changing-pad", category: "bath-and-changing", name: "Contoured changing pad",
    description: "With safety strap",
    priceLabel: "est. 150–300", priceMin: 150, priceMax: 300, basis: "estimate", tier: "budget", inDocBudget: true, inDocFull: true,
    image: p("9248"), imageKind: "store_photo", photoRefs: "9247–9249", retailers: [MOM_STORE_PHOTO],
  },

  // ──────────────────────── Health & grooming ────────────────────────
  {
    slug: "kikka-boo-grooming-set", category: "health-and-grooming", name: "Kikka Boo grooming set",
    description: "8 pieces incl. thermometer, clippers, brush",
    priceLabel: "est. 80–130", priceMin: 80, priceMax: 130, basis: "estimate", tier: "budget", inDocBudget: true, inDocFull: true,
    image: p("9225"), imageKind: "store_photo", photoRefs: "9225", retailers: [MOM_STORE_PHOTO],
  },
  {
    slug: "electric-nosefrida", category: "health-and-grooming", name: "Electric NoseFrida",
    description: "Electric nasal aspirator",
    priceLabel: "~315 online", price: 315, basis: "online", tier: "premium", inDocBudget: false, inDocFull: true, featured: true,
    image: p("9226"), imageKind: "store_photo", photoRefs: "9226", retailers: [MOM_STORE_ONLINE],
  },
  {
    slug: "frida-flake-fixer", category: "health-and-grooming", name: "Frida Flake Fixer",
    description: "Cradle cap kit",
    priceLabel: "~62–67 online", priceMin: 62, priceMax: 67, basis: "online", tier: "budget", inDocBudget: true, inDocFull: true,
    image: p("9227"), imageKind: "store_photo", photoRefs: "9227–9229", retailers: [MOM_STORE_ONLINE],
  },
  {
    slug: "frida-freezer-teether", category: "health-and-grooming", name: "Frida freezer teether",
    description: "Not-Too-Cold-To-Hold",
    priceLabel: "est. 35–55", priceMin: 35, priceMax: 55, basis: "estimate", tier: "premium", inDocBudget: false, inDocFull: true,
    image: p("9229"), imageKind: "store_photo", photoRefs: "9227–9229", retailers: [MOM_STORE_PHOTO],
  },
  {
    slug: "frida-electric-nail-buffer", category: "health-and-grooming", name: "Frida Electric Nail Buffer",
    description: "Electric nail file kit",
    priceLabel: "~209 online", price: 209, basis: "online", tier: "premium", inDocBudget: false, inDocFull: true,
    image: p("9230"), imageKind: "store_photo", photoRefs: "9230", retailers: [MOM_STORE_ONLINE],
  },

  // ───────────────────────────── Feeding ─────────────────────────────
  {
    slug: "mam-easy-start-starter-set", category: "feeding", name: "MAM Easy Start starter set",
    description: "3 anti-colic bottles",
    priceLabel: "~119 online", price: 119, basis: "online", tier: "budget", inDocBudget: true, inDocFull: true,
    image: p("9237"), imageKind: "store_photo", photoRefs: "9237", retailers: [MOM_STORE_ONLINE],
    notes: "The shelf photo shows several MAM products together.",
  },
  {
    slug: "mam-newborn-essentials", category: "feeding", name: "MAM Newborn Essentials",
    description: "Bottles + pacifiers gift set",
    priceLabel: "~197 online", price: 197, basis: "online", tier: "premium", inDocBudget: false, inDocFull: true,
    image: p("9237"), imageKind: "store_photo", photoRefs: "9237", retailers: [MOM_STORE_ONLINE],
    notes: "The shelf photo shows several MAM products together.",
  },
  {
    slug: "mam-feel-good", category: "feeding", name: "MAM Feel Good",
    description: "Glass bottles",
    priceLabel: "est. 50–70 each", priceMin: 50, priceMax: 70, priceUnit: "each", basis: "estimate", tier: "premium", inDocBudget: false, inDocFull: true,
    image: p("9237"), imageKind: "store_photo", photoRefs: "9237", retailers: [MOM_STORE_PHOTO],
    notes: "The shelf photo shows several MAM products together.",
  },
  {
    slug: "mam-pacifiers", category: "feeding", name: "MAM pacifiers",
    description: "Original, Supreme, Start",
    priceLabel: "est. 40–60 per 2-pack", priceMin: 40, priceMax: 60, priceUnit: "per 2-pack", basis: "estimate", tier: "budget", inDocBudget: true, inDocFull: true,
    image: p("9235"), imageKind: "store_photo", photoRefs: "9235–9236", retailers: [MOM_STORE_PHOTO],
  },
  {
    slug: "mam-cups", category: "feeding", name: "MAM cups",
    description: "Fun to Drink / Sports Cup",
    priceLabel: "est. 45–65 each", priceMin: 45, priceMax: 65, priceUnit: "each", basis: "estimate", tier: "premium", inDocBudget: false, inDocFull: true,
    image: p("9237"), imageKind: "store_photo", photoRefs: "9237", retailers: [MOM_STORE_PHOTO],
    notes: "The shelf photo shows several MAM products together.",
  },
  {
    slug: "matchstick-monkey", category: "feeding", name: "Matchstick Monkey",
    description: "Teethers, finger toothbrush",
    priceLabel: "est. 40–65 each", priceMin: 40, priceMax: 65, priceUnit: "each", basis: "estimate", tier: "premium", inDocBudget: false, inDocFull: true,
    image: p("9231"), imageKind: "store_photo", photoRefs: "9231–9233", retailers: [MOM_STORE_PHOTO],
  },
  {
    slug: "silicone-feeding-sets", category: "feeding", name: "Silicone feeding sets",
    description: "Plates, bowls, water bottles",
    priceLabel: "est. 60–120", priceMin: 60, priceMax: 120, basis: "estimate", tier: "premium", inDocBudget: false, inDocFull: true,
    image: p("9234"), imageKind: "store_photo", photoRefs: "9234", retailers: [MOM_STORE_PHOTO],
  },

  // ───────────────────────────── Clothing ─────────────────────────────
  {
    slug: "dinosaur-sleepsuit", category: "clothing", name: "Dinosaur sleepsuit",
    description: "Blue zip-up footed",
    priceLabel: "~79 (55)", price: 79, salePrice: 55, basis: "online", tier: "budget", inDocBudget: true, inDocFull: true,
    image: p("9168"), imageKind: "store_photo", photoRefs: "9168–9169", retailers: [CARTERS],
  },
  {
    slug: "ribbed-bodysuits", category: "clothing", name: "Ribbed bodysuits",
    description: "Short-sleeve multipack",
    priceLabel: "~119 / 4-pack (83)", price: 119, salePrice: 83, priceUnit: "4-pack", basis: "online", tier: "budget", inDocBudget: true, inDocFull: true,
    image: p("9170"), imageKind: "store_photo", photoRefs: "9170–9171", retailers: [CARTERS],
  },
  {
    slug: "lamb-set", category: "clothing", name: "Lamb set",
    description: "Bodysuit + trousers",
    priceLabel: "~85 (59)", price: 85, salePrice: 59, basis: "online", tier: "budget", inDocBudget: true, inDocFull: true,
    image: p("9172"), imageKind: "store_photo", photoRefs: "9172–9173", retailers: [CARTERS],
  },
  {
    slug: "leopard-and-kitten-set", category: "clothing", name: "Leopard & kitten set",
    description: "Bodysuits + kitten trousers",
    priceLabel: "est. 85–105", priceMin: 85, priceMax: 105, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("9174"), imageKind: "store_photo", photoRefs: "9174", retailers: [CARTERS_STORE],
  },
  {
    slug: "cardigan-and-dress-set", category: "clothing", name: "Cardigan & dress set",
    description: "Lilac cardigan, floral dress",
    priceLabel: "est. 89–119", priceMin: 89, priceMax: 119, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("9175"), imageKind: "store_photo", photoRefs: "9175–9176", retailers: [CARTERS_STORE],
  },
  {
    slug: "sage-and-cream-sets", category: "clothing", name: "Sage & cream sets",
    description: "Bodysuit with jacket/blanket",
    priceLabel: "est. 85–110", priceMin: 85, priceMax: 110, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("9179"), imageKind: "store_photo", photoRefs: "9179–9180", retailers: [CARTERS_STORE],
  },
  {
    slug: "palm-print-sleepsuits", category: "clothing", name: "Palm-print sleepsuits",
    description: "Multipack",
    priceLabel: "est. 129–159", priceMin: 129, priceMax: 159, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("9181"), imageKind: "store_photo", photoRefs: "9181", retailers: [CARTERS_STORE],
  },
  {
    slug: "dungarees", category: "clothing", name: "Dungarees",
    description: "Sage, with top",
    priceLabel: "est. 89–109", priceMin: 89, priceMax: 109, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("9182"), imageKind: "store_photo", photoRefs: "9182", retailers: [CARTERS_STORE],
  },
  {
    slug: "trousers-and-shorts", category: "clothing", name: "Trousers / shorts",
    description: "Grey jogger; navy & grey shorts",
    priceLabel: "est. 39–55 each", priceMin: 39, priceMax: 55, priceUnit: "each", basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("9183"), imageKind: "store_photo", photoRefs: "9183–9184", retailers: [CARTERS_STORE],
  },
  {
    slug: "mixed-bodysuit-sets", category: "clothing", name: "Mixed bodysuit sets",
    description: "Neutral 6–7 pack",
    priceLabel: "~159 (109–111)", price: 159, salePrice: 110, basis: "online", tier: "budget", inDocBudget: true, inDocFull: true,
    image: p("9185"), imageKind: "store_photo", photoRefs: "9185", retailers: [CARTERS],
    notes: "Sale price was AED 109–111 depending on the pack; AED 110 (the middle) is used for totals.",
  },
  {
    slug: "hats", category: "clothing", name: "Hats",
    description: "Pink knot hats",
    priceLabel: "est. 35–45", priceMin: 35, priceMax: 45, basis: "estimate", tier: "budget", inDocBudget: true, inDocFull: true,
    image: p("9186"), imageKind: "store_photo", photoRefs: "9186", retailers: [CARTERS_STORE],
  },
  {
    slug: "socks", category: "clothing", name: "Socks",
    description: "Frilly, multipack",
    priceLabel: "est. 39–55", priceMin: 39, priceMax: 55, basis: "estimate", tier: "budget", inDocBudget: true, inDocFull: true,
    image: p("9187"), imageKind: "store_photo", photoRefs: "9187", retailers: [CARTERS_STORE],
  },
  {
    slug: "shoes-and-bows", category: "clothing", name: "Shoes & bows",
    description: "Cream shoes; floral bows",
    priceLabel: "est. 59–79 / 29–45", priceMin: 88, priceMax: 124, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("9188"), imageKind: "store_photo", photoRefs: "9188", retailers: [CARTERS_STORE],
    notes: "Shoes est. AED 59–79; bows est. AED 29–45. The range shown (AED 88–124) is one of each.",
  },
  {
    slug: "scratch-mittens", category: "clothing", name: "Scratch mittens",
    description: "Grey and white",
    priceLabel: "est. 25–35", priceMin: 25, priceMax: 35, basis: "estimate", tier: "budget", inDocBudget: true, inDocFull: true,
    image: p("9189"), imageKind: "store_photo", photoRefs: "9189", retailers: [CARTERS_STORE],
  },
  {
    slug: "bibs", category: "clothing", name: "Bibs",
    description: "White, pack",
    priceLabel: "est. 49–69", priceMin: 49, priceMax: 69, basis: "estimate", tier: "budget", inDocBudget: true, inDocFull: true,
    image: p("9190"), imageKind: "store_photo", photoRefs: "9190", retailers: [CARTERS_STORE],
  },
  {
    slug: "blankets", category: "clothing", name: "Blankets",
    description: "Teddy-print receiving blankets",
    priceLabel: "est. 79–99", priceMin: 79, priceMax: 99, basis: "estimate", tier: "budget", inDocBudget: true, inDocFull: true,
    image: p("9191"), imageKind: "store_photo", photoRefs: "9191", retailers: [CARTERS_STORE],
  },

  // ─────────────────────── Extras & inspiration ───────────────────────
  {
    slug: "momcozy-bottle-warmer", category: "extras-and-inspiration", name: "Momcozy bottle warmer",
    description: "Nutri Smart",
    priceLabel: "~275 online", price: 275, basis: "online", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("insp-bottle-warmer"), imageKind: "inspiration", retailers: MOMCOZY,
  },
  {
    slug: "momcozy-portable-warmer", category: "extras-and-inspiration", name: "Momcozy portable warmer",
    description: "Cordless, for travel",
    priceLabel: "~399 online", price: 399, basis: "online", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("insp-portable-warmer"), imageKind: "inspiration", retailers: MOMCOZY,
  },
  {
    slug: "momcozy-kleanpal-pro", category: "extras-and-inspiration", name: "Momcozy KleanPal Pro",
    description: "Bottle washer, steriliser, dryer",
    priceLabel: "~1,299–1,449 online", priceMin: 1299, priceMax: 1449, basis: "online", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("insp-bottle-washer"), imageKind: "inspiration", retailers: MOMCOZY,
  },
  {
    slug: "momcozy-food-maker", category: "extras-and-inspiration", name: "Momcozy food maker",
    description: "Steams and blends purees",
    priceLabel: "from ~139; est. up to 350", priceMin: 139, priceMax: 350, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("insp-food-maker"), imageKind: "inspiration", retailers: MOMCOZY,
    notes: "From about AED 139 online; estimated up to AED 350 depending on the model.",
  },
  {
    slug: "momcozy-s12-pro-pump", category: "extras-and-inspiration", name: "Momcozy S12 Pro pump",
    description: "Wearable, double",
    priceLabel: "~725 online", price: 725, basis: "online", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("insp-breast-pump"), imageKind: "inspiration", retailers: MOMCOZY,
  },
  {
    slug: "momcozy-wipe-warmer", category: "extras-and-inspiration", name: "Momcozy wipe warmer",
    description: "Keeps wipes warm",
    priceLabel: "est. 120–180", priceMin: 120, priceMax: 180, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("insp-wipe-warmer"), imageKind: "inspiration", retailers: MOMCOZY,
  },
  {
    slug: "forehead-thermometer", category: "extras-and-inspiration", name: "Forehead thermometer",
    description: "Digital, no-touch",
    priceLabel: "est. 60–120", priceMin: 60, priceMax: 120, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("insp-thermometer"), imageKind: "inspiration", retailers: [],
  },
  {
    slug: "duck-bath-thermometer", category: "extras-and-inspiration", name: "Duck bath thermometer",
    description: "Floating, shows water temp",
    priceLabel: "est. 30–60", priceMin: 30, priceMax: 60, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("insp-bath-duck"), imageKind: "inspiration", retailers: [],
  },
  {
    slug: "twistshake-bath-and-stand", category: "extras-and-inspiration", name: "Twistshake bath + stand",
    description: "Foldable tub, storage stand",
    priceLabel: "est. 1,000–1,400", priceMin: 1000, priceMax: 1400, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("insp-twistshake"), imageKind: "inspiration", retailers: [],
  },
  {
    slug: "nursery-glider", category: "extras-and-inspiration", name: "Nursery glider",
    description: "Bouclé rocking chair",
    priceLabel: "est. 800–2,000", priceMin: 800, priceMax: 2000, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true, featured: true,
    image: p("insp-glider"), imageKind: "inspiration", retailers: [],
  },
  {
    slug: "sound-machine", category: "extras-and-inspiration", name: "Sound machine",
    description: "White noise, light, clock",
    priceLabel: "est. 300–450", priceMin: 300, priceMax: 450, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("insp-sound-machine"), imageKind: "inspiration", retailers: [],
  },
  {
    slug: "play-gym", category: "extras-and-inspiration", name: "Play gym",
    description: "Arch toys + padded mat",
    priceLabel: "est. 200–400", priceMin: 200, priceMax: 400, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("insp-play-gym"), imageKind: "inspiration", retailers: [],
  },
  {
    slug: "high-chair", category: "extras-and-inspiration", name: "High chair",
    description: "Convertible, with tray",
    priceLabel: "est. 400–900", priceMin: 400, priceMax: 900, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("insp-high-chair"), imageKind: "inspiration", retailers: [],
  },
  {
    slug: "silicone-feeding-set", category: "extras-and-inspiration", name: "Silicone feeding set",
    description: "Bib, plate, cup, cutlery",
    priceLabel: "est. 80–150", priceMin: 80, priceMax: 150, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("insp-feeding-set"), imageKind: "inspiration", retailers: [],
  },
  {
    slug: "diaper-bag", category: "extras-and-inspiration", name: "Diaper bag",
    description: "Backpack with changing mat",
    priceLabel: "est. 150–400", priceMin: 150, priceMax: 400, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("insp-diaper-bag"), imageKind: "inspiration", retailers: [],
  },
  {
    slug: "bath-time-essentials", category: "extras-and-inspiration", name: "Bath time essentials",
    description: "Hooded towel, cloths, wash, lotion",
    priceLabel: "est. 150–250", priceMin: 150, priceMax: 250, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("insp-bath-essentials"), imageKind: "inspiration", retailers: [],
  },
  {
    slug: "knit-romper-set", category: "extras-and-inspiration", name: "Knit romper set",
    description: "Romper, bobble hat, booties",
    priceLabel: "est. 100–200", priceMin: 100, priceMax: 200, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("insp-knit-romper"), imageKind: "inspiration", retailers: [],
  },
  {
    slug: "plush-teddy", category: "extras-and-inspiration", name: "Plush teddy",
    description: "Soft comforter",
    priceLabel: "est. 60–150", priceMin: 60, priceMax: 150, basis: "estimate", tier: "standard", inDocBudget: false, inDocFull: true,
    image: p("insp-teddy"), imageKind: "inspiration", retailers: [],
  },
];
