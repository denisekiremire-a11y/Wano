/**
 * Direct product links, researched on 17 November 2026.
 *
 * verified: true  → the page was opened during research: it returned HTTP 200 and its title named
 *                   the product (see docs/DATA_NOTES.md, "Direct product links").
 * verified: false → found via search with a matching title and price, but the retailer blocked
 *                   automated visits, so the page itself could not be opened. Shown to guests as
 *                   "not yet checked".
 *
 * Gifts not listed here have no single identifiable product page (most Carter's clothing and the
 * generic inspiration items); guests get a search on the retailer's own website instead.
 */

export interface RetailerExtra {
  slug: string;
  name: string;
  websiteUrl: string | null;
  /** `{q}` is replaced by the URL-encoded product name. Only patterns that were checked. */
  searchUrlTemplate: string | null;
  notes: string;
}

export const retailerExtras: RetailerExtra[] = [
  {
    slug: "mom-store",
    name: "Mom Store",
    websiteUrl: "https://www.momstore.com/ae-en/",
    searchUrlTemplate: "https://www.momstore.com/ae-en/catalogsearch/result/?q={q}",
    notes: "UAE baby store (Lals Group) — online at momstore.com, stores reported at City Centre Mirdif and The Dubai Mall. Also stocks Carter's.",
  },
  {
    slug: "carters",
    name: "Carter's",
    websiteUrl: "https://ae.carters.com/",
    searchUrlTemplate: "https://ae.carters.com/catalogsearch/result/?q={q}",
    notes: "Carter's UAE online store. Carter's is also sold in Mom Store.",
  },
  {
    slug: "mamas-and-papas",
    name: "Mamas & Papas UAE",
    websiteUrl: "https://mamasandpapas.ae/",
    searchUrlTemplate: null,
    notes: "Several items are listed here at exactly the prices in the original list.",
  },
  {
    slug: "mumzworld",
    name: "Mumzworld",
    websiteUrl: "https://www.mumzworld.com/en",
    searchUrlTemplate: "https://www.mumzworld.com/en/search?q={q}",
    notes: "UAE online baby store.",
  },
  { slug: "carrefour-uae", name: "Carrefour UAE", websiteUrl: null, searchUrlTemplate: null, notes: "" },
  { slug: "centrepoint", name: "Centrepoint", websiteUrl: null, searchUrlTemplate: null, notes: "" },
];

export interface ProductLink {
  gift: string; // gift slug
  retailer: string; // retailer slug
  url: string;
  verified: boolean;
  /** Shown to guests next to the link: what exactly the page is, or how it differs. */
  note: string;
}

const MS = "mom-store";
const MP = "mamas-and-papas";
const MW = "mumzworld";

export const productLinks: ProductLink[] = [
  // Travel
  { gift: "doona-plus-grey-hound", retailer: MP, verified: true, url: "https://mamasandpapas.ae/doona-infant-car-seat-grey-hound-218794628.html", note: "Doona+ Infant Car Seat, Grey Hound" },
  { gift: "kikka-boo-goya-platinum", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/kikkaboo-goya-platinum-2-in-1-stroller-with-carrycot-grey-n00057737/", note: "Goya Platinum 2-in-1 with carrycot, Grey (also in Black)" },
  { gift: "bugaboo-compact-stroller", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/bugaboo-butterfly-2-complete-stroller-forest-green-6-months-4-years-n00057383/", note: "Bugaboo Butterfly 2 — model identified from the photo; listed online in Forest Green" },
  { gift: "cybex-cloud-t-i-size", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/cybex-cloud-t-i-size-plus-car-seat-sepia-black-n00052923mltna/", note: "Cloud T i-Size Plus, Sepia Black" },
  { gift: "cybex-base-t", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/cybex-platinum-base-t-black-n00045376/", note: "Cybex Platinum Base T, Black" },
  { gift: "cybex-sirona-t-i-size", retailer: MP, verified: true, url: "https://mamasandpapas.ae/cybex-sirona-t-i-size---sepia-black-216564349.html", note: "Sirona T i-Size, Sepia Black" },
  // Sleep & nursery
  { gift: "maxi-cosi-iora-air", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/maxi-cosi-iora-air-co-sleeper-beyond-grey-eco-n00048423/", note: "Iora Air co-sleeper, Beyond Grey" },
  { gift: "bugaboo-stardust", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/bugaboo-stardust-compact-and-stylish-travel-crib-black-6-months-4-years-n00057363/", note: "Bugaboo Stardust travel cot, Black" },
  { gift: "wave-3-in-1-cot", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/momstore-waves-3-in-1-baby-cot-white-convertible-bed-0-4-years-n00056036/", note: "Waves 3-in-1 Baby Cot" },
  { gift: "wave-chest-of-drawers", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/momstore-waves-chest-of-3-drawers-white-spacious-storage-0-4-years-n00056037/", note: "Waves Chest of 3 Drawers" },
  { gift: "strips-cot-bed", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/mm-strips-3-in-1-cot-elegant-design-white-0-5-months-n00057893/", note: "Strips 3-in-1 Cot, White" },
  { gift: "kenva-dresser", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/mm-kenva-3-big-drawers-dresser-oak-0-months-n00057892/", note: "Kenva 3-drawer dresser, Oak" },
  { gift: "pluto-dresser", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/mm-pluto-3-big-drawers-dresser-clay-0-months-n00057890/", note: "Pluto 3-drawer dresser — listed online in Clay" },
  { gift: "4moms-mamaroo", retailer: MP, verified: true, url: "https://mamasandpapas.ae/4moms-mamaroo-multi-motion-baby-swing-5.0---grey-217342737.html", note: "mamaRoo 5.0, Grey" },
  { gift: "eufy-baby-monitor-e21", retailer: "carrefour-uae", verified: false, url: "https://www.carrefouruae.com/mafuae/en/ip-camera/eufy-baby-monitor-e21-4k-uhd-cam-wh/p/2237860", note: "eufy Baby Monitor E21 4K, White" },
  { gift: "hellobaby-hb6338", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/hellobaby-video-baby-monitor-zoom-night-vision-8-1cm-0-24-months-n00058274/", note: "HelloBaby video monitor, 8.1 cm (3.2\") screen" },
  { gift: "lulujo-muslin-swaddles", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/lulujo-2-pack-cotton-swaddles-mushroom-sand-n00052685mltna/", note: "Lulujo 2-pack cotton swaddles, Mushroom & Sand (other prints available)" },
  { gift: "clevasleep-swaddle", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/clevasleep-swaddle-hedgehog-hip-healthy-design-0-3-months-n00058350/", note: "ClevaSleep Swaddle 0–3 months, Hedgehog" },
  { gift: "cleva-mama-3-in-1-romper", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/clevamama-3-in-1-nite-nite-romper-n00003139/", note: "Cleva Mama 3-in-1 Nite Nite Romper" },
  // Bath & changing
  { gift: "stokke-flexi-bath-support", retailer: MP, verified: true, url: "https://mamasandpapas.ae/flexi-bath-bundle-218440294.html", note: "Stokke Flexi Bath bundle with newborn support" },
  { gift: "stokke-flexi-bath-stand", retailer: MP, verified: true, url: "https://mamasandpapas.ae/flexi-bath-stand-218440293.html", note: "Stokke Flexi Bath Stand" },
  { gift: "skip-hop-moby", retailer: MP, verified: true, url: "https://mamasandpapas.ae/moby-smart-sling-3-stage-tub-213290027.html", note: "Skip Hop Moby Smart Sling 3-Stage Tub" },
  { gift: "carters-wash-cloths", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/carter-s-baby-neutral-lion-6-pack-washcloths-yellow-1v379610/", note: "Carter's 6-pack washcloths, neutral lion design (designs vary)" },
  { gift: "cuddledry", retailer: MP, verified: true, url: "https://mamasandpapas.ae/cuddledry-handsfree-baby-towel-hooded---white-217895190.html", note: "Cuddledry hands-free towel, White" },
  // Health & grooming
  { gift: "electric-nosefrida", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/fridababy-baby-unisex-electric-nosefrida-nasal-aspirator-white-blue-nb-n00057801/", note: "Electric NoseFrida" },
  { gift: "frida-flake-fixer", retailer: MP, verified: true, url: "https://mamasandpapas.ae/dermafrida-the-flakefixer---spongebrush-and-comb-set-214193534.html", note: "DermaFrida The FlakeFixer set" },
  { gift: "frida-freezer-teether", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/fridababy-baby-unisex-teether-toy-not-too-cold-pink-yellow-3-6-m-n00057787/", note: "Frida Not-Too-Cold-To-Hold teether" },
  { gift: "frida-electric-nail-buffer", retailer: MW, verified: true, url: "https://www.mumzworld.com/en/fridababy-electric-nail-buffer-kit-38725568-100001655", note: "Fridababy Electric Nail Buffer Kit" },
  // Feeding
  { gift: "mam-easy-start-starter-set", retailer: MP, verified: true, url: "https://mamasandpapas.ae/mam-baby-easy-start-anticolic-starter-set-silicone-flexible-set---0-m-%7C-sealife-blue---pack-of-3-219361897.html", note: "MAM Easy Start Anti-Colic Starter Set, pack of 3" },
  { gift: "mam-pacifiers", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/mam-baby-original-start-pacifier-pink-beige-2-pack-n00058087/", note: "MAM Original Start pacifiers, 2-pack (other styles available)" },
  { gift: "mam-cups", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/mam-baby-fun-to-drink-cup-better-together-blue-270ml-1-piece-n00058142/", note: "MAM Fun to Drink Cup 270 ml (other colours available)" },
  { gift: "matchstick-monkey", retailer: MS, verified: true, url: "https://www.momstore.com/ae-en/matchstick-monkey-teething-starter-set-peach-3-months-n00058154/", note: "Matchstick Monkey Teething Starter Set, Peach" },
  // Extras
  { gift: "momcozy-bottle-warmer", retailer: MW, verified: true, url: "https://www.mumzworld.com/en/momcozy-nutri-smart-baby-bottle-warmer-white-green-38394224-qmmw002", note: "Momcozy Nutri Smart bottle warmer" },
  { gift: "momcozy-kleanpal-pro", retailer: "carrefour-uae", verified: false, url: "https://www.carrefouruae.com/mafuae/en/baby-sterilizer-food-warmer/momcozy-kleanpal-pro-baby-bottle-washer-white/p/762765367759", note: "Momcozy KleanPal Pro, White" },
  { gift: "momcozy-food-maker", retailer: MW, verified: true, url: "https://www.mumzworld.com/en/momcozy-puree-food-storage-baby-food-maker-38394224-qmse001", note: "Momcozy baby food maker" },
  { gift: "momcozy-s12-pro-pump", retailer: MW, verified: true, url: "https://www.mumzworld.com/en/momcozy-wearable-double-breast-pump-s12-pro-white-38394224-qm1103s-2", note: "Momcozy S12 Pro double wearable pump" },
  { gift: "momcozy-wipe-warmer", retailer: MW, verified: true, url: "https://www.mumzworld.com/en/momcozy-baby-wipes-warmer-38394224-qmww004", note: "Momcozy baby wipes warmer" },
];
