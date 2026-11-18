-- Adds Peekaboo's 2-in-1 Wooden Convertible Crib as an extra gift, next to the wooden cot
-- (the family wants both). Details from peekaboo.ug on 18 November 2026: on sale at
-- UGX 1,421,300 (was UGX 1,579,200), in stock. Safe to run more than once.

insert into public.gifts (slug, category_id, name, description, notes, price_aed, sale_price_aed,
  price_basis, price_label, tier, image_url, image_kind, image_caption, sort_order)
select
  'peekaboo-2-in-1-wooden-convertible-crib-white',
  cot.category_id,
  'Peekaboo 2-in-1 wooden convertible crib (White)',
  'Baby cot that converts into a toddler bed, newborn to 5 years',
  'On sale at Peekaboo on 18 November 2026 (was UGX 1,579,200). The sale price may end — check before buying.',
  1579200, 1421300,
  'online', 'UGX 1,421,300 on sale (was UGX 1,579,200) at peekaboo.ug, 18 November 2026', 'standard',
  'https://cdn.shopify.com/s/files/1/0652/7202/1168/files/1_3ea5b6ef-9a6b-4b17-bb06-57944914b176.png?v=1721827268',
  'uploaded', 'Product photo from Peekaboo Uganda',
  cot.sort_order + 1
from public.gifts cot
where cot.slug = 'peekaboo-wooden-cot-with-mosquito-net'
on conflict (slug) do nothing;

insert into public.gift_retailers (gift_id, retailer_id, product_url, url_verified, product_note, is_primary)
select g.id, r.id,
  'https://www.peekaboo.ug/products/peekaboos-2-in-1-wooden-convertible-crib-baby-cot-toddler-s-bed-white-age-newborn-to-5-years',
  true, 'Peekaboo''s 2 In 1 Wooden Convertible Crib (Baby Cot+Toddler Bed) White', true
from public.gifts g, public.retailers r
where g.slug = 'peekaboo-2-in-1-wooden-convertible-crib-white' and r.slug = 'peekaboo-ug'
on conflict (gift_id, retailer_id) do nothing;
