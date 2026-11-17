# Administrator guide

Sign in at **`/admin/login`** (there's also a discreet “Family login” link in the site footer).
Admin pages update live: new reservations appear without refreshing (see the **Live** dot at the
top right).

## Overview (`/admin`)

Total, available, reserved and purchased counts; the estimated value of the wishlist (excluding
alternatives) in AED and UGX; the value already reserved or purchased; the original document's
estimates next to the live totals; gifts waiting to be purchased; and recent reservation activity.

## Knowing when someone reserves

- **Email:** if you've set up Resend (see DEPLOYMENT.md, "Optional: email notifications"), you get
  an email for every reservation with the gift, the guest's name, contact details, message and a
  button to the reservations page.
- **Live dashboard:** any open admin page updates by itself the moment a guest reserves.
- Guests see everything they've pledged under **My gifts** (`/my-gifts`), so they rarely need to
  ask you what they promised to buy.

## Reservations (`/admin/reservations`)

Each row shows the guest's name, email, phone, gift, price at reservation, date and time (Dubai
time), reference and status. Search by name, email, phone, gift or reference, and filter by status.

| Action | What it does |
| --- | --- |
| **Purchased** | The guest has bought the gift. Gift → PURCHASED; the reservation is kept as purchased. |
| **Release** | Puts the gift back to AVAILABLE (e.g. the guest changed their mind). The reservation is kept in history as *released*. |
| **Cancel** | Same effect as Release, recorded as *cancelled* (e.g. a mistaken or duplicate reservation). |
| **History** | Every event for that reservation: reserved, purchased, released, with who did it and when, plus the guest's message. |

Reservations are **never released automatically** unless you turn on expiry in Settings.

## Gifts (`/admin/gifts`)

- **Availability** drop-down on each row: set *Available* (releases any reservation) or
  *Purchased* (e.g. you bought it yourself). *Reserved* can only come from a guest's reservation,
  so there is always a name and reference behind it.
- **Edit** opens the full editor:
  - name, URL slug, category, description, notes (notes are shown to guests);
  - **price**: a single price, a sale price (the original is shown struck through), or an estimated
    range. Never enter an exact price for something you only have a range for. Also set the
    *price type* (in-store shelf tag / online / estimate), the unit (e.g. “each”, “4-pack”) and the
    original price text;
  - **image**: *Upload image* (JPEG/PNG/WebP/AVIF, up to 5 MB, stored in Supabase Storage), and
    say what kind of image it is. *Inspiration picture* adds a visible “Inspiration” tag so guests
    know it isn't the exact product;
  - flags: featured on the homepage, alternative (excluded from totals), counted in the budget or
    full-wishlist selection, and option type (budget-friendly / standard / premium pick, which
    drives the guest filters);
  - **Where to buy**: link the gift to a shop. Add a **direct product URL** only after you've
    opened it and checked it, then tick *I've checked this link works*. Without a URL, guests get
    a clearly labelled Google search instead.
- **Add gift** creates a new one. **Delete** removes a gift. A reserved or purchased gift must be
  released first. Its reservation history is kept with the gift's name.

## Shops (`/admin/retailers`)

The four shops named in the PDF are pre-loaded: Mom Store, Carter's, Carrefour UAE and Centrepoint.
For each shop you can add its **website**, **phone** and any number of **physical stores** (name,
mall/area, address, phone, Google Maps link, “details verified” tick). Guests then see those
stores with a **Directions** button. Until a shop has stores, guests get a “Find *shop* stores in
Dubai” Google Maps search. Add only details you have checked.

## Settings (`/admin/settings`)

- **Currency:** the AED→UGX rate and its source. Saving updates every open page instantly;
  clearing the field returns the site to AED-only. A rate history is kept.
- **Registry text:** title, welcome heading and text, and the price notice shown to guests.
- **Optional reservation expiry:** off by default. If you turn it on and set a number of hours,
  reservations not yet marked purchased are released automatically once a day after that time.
- **Spam protection:** maximum reservations per guest per day (default 5) and attempts per
  10 minutes (default 15).

## Exports

**Reservations CSV** and **Gifts CSV** buttons on the Overview, Reservations and Gifts pages.
Files open cleanly in Excel, Numbers or Google Sheets (UTF-8, formula-safe).

## Good practice

- Keep the secret key out of chats and emails. It belongs only in Vercel's environment settings
  and your own `.env.local`.
- Use a long, unique password for your admin account. Remove an admin by deleting their row in
  `admin_profiles`, or the user in **Supabase → Authentication → Users**.
- Guest details are private: only admins can see them. The CSVs contain personal data, so store
  them carefully.
