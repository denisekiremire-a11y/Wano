# How Baby_List.pdf was imported

**Source:** *Baby List — Our shortlist from Mom Store & Carter's, Dubai · 24 October 2026*
(10 pages). The import lives in [`data/wishlist.ts`](../data/wishlist.ts). The SQL migration is
generated from it (`npm run seed:sql`), and a unit test fails if the two ever disagree.

## What was imported

All **77 options** in the PDF's seven tables, in the original order, with nothing dropped:

| Category | Options | of which alternatives |
| --- | --- | --- |
| Travel | 7 | 2 (Bugaboo stroller, Cybex Sirona T) |
| Sleep & nursery | 14 | 5 (Bugaboo Stardust, Strips cot, Kenva and Pluto dressers, BabyBjörn bouncer) |
| Bath & changing | 10 | 1 (Luma bath) |
| Health & grooming | 5 | 0 |
| Feeding | 7 | 0 |
| Clothing | 16 | 0 |
| Extras & inspiration | 18 | 0 |

For each option the registry stores: name, description (“What it is”), category, the **verbatim
price text** from the PDF, the parsed numbers, the **price type** and notes. Category intros (e.g.
“Nursery furniture was 25% off on the day.”) are kept as category descriptions.

### Price rules

- **Price type** follows the PDF's own legend: un-prefixed figures are shelf tags photographed in
  store (*In-store price*), “online” figures are UAE retailer prices (*Online price*), and “est.”
  figures are estimates (*Estimated price*). Estimates are never labelled as confirmed.
- **Ranges stay ranges.** “est. 800–1,500” is stored as from 800 to 1,500 and shown as
  “AED 800–1,500”. No single price was invented.
- **Sales:** “was 2,499 · now 1,874” and Carter's “~79 (55)” are stored as price + sale price; the
  original price is shown struck through.
- **Reference price** (used for sorting, price filters and totals): the sale price, else the listed
  price, else the middle of the range. That last part is the PDF's own rule: “Estimates use the
  middle of each range.”

### Items needing interpretation (each explained to guests in the gift's notes)

| Item | PDF text | How it's stored |
| --- | --- | --- |
| Maxi-Cosi Iora Air | `1,691 in store · ~1,353 online` | AED 1,691 in-store price; online price kept in the notes |
| Bugaboo compact stroller | `~2,899 (tag partly hidden)` | AED 2,899, typed as an **estimate** because the tag was only partly legible |
| 4moms mamaRoo | `1,349 (sale)` | Sale price 1,349; the original price wasn't recorded |
| Mixed bodysuit sets | `~159 (109–111)` | Price 159, sale 110 (middle of 109–111), explained in the notes |
| Shoes & bows | `est. 59–79 / 29–45` | Range 88–124 = one pair of shoes + one bow, explained in the notes |
| Momcozy food maker | `from ~139; est. up to 350` | Estimated range 139–350 |
| Carrycot / pram (display) | `est. 800–1,500` | Brand not identified in the PDF |

## Budget totals

The PDF's figures are preserved **exactly as written**: budget **~AED 7,860**, full wishlist
**~AED 25,500**, the per-category table, and its explanation. They appear in the admin overview
(the public budget page was removed at the family's request).

The PDF does not list which items make up each scenario, so membership (`in_doc_budget`,
`in_doc_full`) was **reconstructed from the per-category subtotals**:

| Category | PDF budget | Live budget | PDF full | Live full |
| --- | --- | --- | --- | --- |
| Travel | ~3,200 | 3,199 | ~6,610 | 6,607 |
| Sleep & nursery | ~1,870 | 2,209 ¹ | ~7,780 | 7,755 |
| Bath & changing | ~690 | 688 | ~1,500 | 1,503 |
| Health & grooming | ~170 | 169.50 | ~740 | 738.50 |
| Feeding | ~170 | 169 | ~620 | 623.50 |
| Clothing | ~570 | 572 | ~1,450 | 1,264.50 ² |
| Extras & inspiration | ~1,190 | — ³ | ~6,800 | 8,072.50 ³ |

1. The PDF's budget bought the bedside cot online (~1,353); the registry uses its in-store price
   (1,691). The difference of 338 accounts for the gap exactly.
2. The registry counts clothing at sale prices where they were recorded.
3. The PDF doesn't say which extras make up its Extras figures, and no combination reproduces them,
   so no extras are flagged as budget picks and all of them are counted in the full selection,
   following the PDF's rule “plus every extra from the inspiration pictures”. You can change any
   item's flags in the admin.

Alternatives are excluded from both scenarios, as the PDF specifies. The *Premium pick* and
*Budget-friendly* guest filters follow the same reconstruction. Budget-friendly items are those in
the budget selection; premium picks are the full-only choices in Travel, Sleep, Bath, Health and
Feeding.

## Images

The PDF embeds one photo collage per section. `scripts/extract-pdf-images.py` crops each numbered
photo out of the grid and trims the photo-number label. The photo numbers are kept in each gift's
caption, e.g. “In-store photo from the original wishlist (photo 9207–9210)”.

- **59 gifts** use the family's own in-store photos.
- **18 extras** use crops from the inspiration board. They carry a visible **Inspiration** tag and
  the caption “not necessarily the exact product”.
- Some photos show several products: four MAM items share shelf photo 9237, and the HelloBaby
  monitor shares the eufy shelf photo.
- The crops are small (about 240 × 260 px, as embedded in the PDF). Uploading better photos
  through the admin is recommended for the most important gifts.
- Photos 9177 and 9178 (general store displays) don't correspond to a single product and weren't
  used. Photos 9196–9197 aren't in the PDF.

## Direct product links (researched 17 November 2026)

The PDF has no web links, so the exact products were looked up on UAE retailers' websites:
**Mom Store** (momstore.com, the store most photos were taken in), **Mamas & Papas UAE**,
**Mumzworld** and **Carrefour UAE**. The links are in [`data/product-links.ts`](../data/product-links.ts),
with a note for each saying exactly what the page is.

- **37 gifts have a direct "Buy" link.** 35 were opened during research: each returned HTTP 200 and
  its page title named the product. Several are listed at exactly the PDF's prices (for example the
  Iora Air at AED 1,691, and the Stokke Flexi Bath bundle, bath stand, Skip Hop Moby and Cuddledry
  at AED 299 / 359 / 299 / 225 at Mamas & Papas UAE).
- **2 Carrefour links** (eufy E21 monitor, Momcozy KleanPal Pro) came from search results with
  matching titles and prices, but Carrefour blocks automated visits, so they show to guests as
  "link not yet checked". Please open them once and tick "I've checked this link works" in the
  admin.
- **Where the exact colour or model differs**, the note says so: Doona+ in Grey Hound is only at
  Mamas & Papas; the Bugaboo stroller's model (Butterfly 2) was identified from the photo and is
  listed online in Forest Green; the Pluto dresser is listed online in Clay.
- **Rejected while checking:** a Mumzworld Doona link from search results was dead (404), and Mom
  Store's BabyBjörn Bliss page now redirects to a category. Neither was used.
- **No direct link (40 gifts):** most Carter's clothing (the exact items can't be identified from
  the photos and stock rotates), the generic inspiration extras (e.g. "Play gym"), and a few branded
  items with no UAE product page found (e.g. MAM Feel Good, MAM Newborn Essentials, Luma bath set,
  Kikka Boo towel and grooming set). Guests get a search **on the retailer's own website** (Mom
  Store, Carter's UAE, Mumzworld), with Google only as a last resort.

Prices and stock change; the registry never claims an item is in stock.

## Information the PDF does not contain (fill in via the admin when verified)

- **No direct product URLs** in the PDF — see "Direct product links" above for what was found.
- **No store addresses or phone numbers.** Guests see Google Maps searches such as “Mom Store
  Dubai”. Add verified stores under Admin → Shops.
- **Retailer per item:** the PDF names Mom Store and Carter's as the shortlist's sources and
  Carrefour UAE / Centrepoint for Momcozy prices. Items are linked accordingly (Carter's-branded
  items and clothing to Carter's, Momcozy to Carrefour UAE and Centrepoint, other photographed items
  to Mom Store). Unbranded extras have no retailer.
- **No exchange rate.** The UGX conversion stays off until you set a rate.
- **Stock availability** isn't recorded anywhere, and the registry never claims an item is in stock.
