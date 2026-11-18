# Baby Gift Registry — “Baby Peaches”

A private, shareable baby gift registry built from **Baby_List.pdf**. Guests open one link, browse
the wishlist (AED, plus UGX once you set a rate), reserve a gift without an account, and buy it
online or in a Dubai store. Reservations are atomic and appear live for every visitor. The family
manages everything from a private admin dashboard.

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · Supabase (Postgres, Auth,
Realtime, Storage) · Lucide icons · Vercel.

| Guide | What's in it |
| --- | --- |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Step-by-step: Supabase project, migrations, admin account, env vars, exchange rate, Vercel, custom domain, launch checks |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | Day-to-day use of the dashboard: reservations, products, shops, currency, exports |
| [docs/DATA_NOTES.md](docs/DATA_NOTES.md) | Exactly how the PDF was imported, what was missing, and how totals are calculated |
| [docs/TESTING.md](docs/TESTING.md) | Running the unit, database/security and end-to-end tests locally |

## Pages

| URL | Who | Purpose |
| --- | --- | --- |
| `/` | Everyone | Welcome, live progress, categories, featured gifts, full collection with search/filters |
| `/registry` | Everyone | The full wishlist (`?q=` pre-fills the search) |
| `/registry/[category]` | Everyone | One category, e.g. `/registry/travel` |
| `/gift/[id]` | Everyone | A gift by slug (`/gift/doona-plus-grey-hound`) or UUID, with Where to buy |
| `/reservation/[reference]` | Guest with the link | Confirmation: reference, price, where to buy, reminder to purchase |
| `/my-gifts` | Guest | Everything this guest has pledged, with a count, status and a private link to open it on other devices |
| `/admin/login` | Family | Sign in |
| `/admin` | Admin | Overview: counts, value, activity |
| `/admin/reservations` | Admin | All reservations with guest details; purchase / cancel / release / delete; history; search; CSV |
| `/admin/gifts`, `/admin/gifts/new`, `/admin/gifts/[id]` | Admin | Product management, image upload, shopping links |
| `/admin/retailers` | Admin | Shops: verified websites, store addresses, phone numbers, map links |
| `/admin/settings` | Admin | AED→UGX rate, welcome text, price notice, optional expiry, spam limits |
| `/admin/export/reservations`, `/admin/export/gifts` | Admin | CSV downloads |

## How the important parts work

- **Atomic reservations.** Guests submit to a server action, which calls the Postgres function
  `reserve_gift()` with the server-only secret key. The function locks the gift row
  (`SELECT … FOR UPDATE`), re-checks that it is still available at that exact moment, inserts the
  reservation and flips the status in one transaction. A partial unique index
  (`one live reservation per gift`) is a second, independent guarantee. Tests fire 30 simultaneous
  API calls and 25 parallel open transactions at one gift: exactly one wins every time.
- **Real time.** Every open registry page subscribes to Supabase Realtime `postgres_changes` on
  `gifts` (and `registry_settings` for the exchange rate). It catches up on reconnect or when a
  phone wakes up. It does not poll.
- **Privacy.** Row Level Security: guests can read only catalogue tables. Reservations, guest
  names, emails, phones, messages, activity history and spam-throttle data are readable only by
  admins (users listed in `admin_profiles`). Realtime respects the same rules: anonymous
  subscribers receive no reservation data. The confirmation page shows only the guest's first name.
- **Admin security** is enforced in three layers: the Next.js proxy redirects signed-out
  visitors, every admin page, action and export re-checks `is_admin()` on the server, and RLS
  enforces it again in the database. Gift status can only change through the reservation-aware
  functions, so reservations and availability can't drift apart.
- **Spam protection.** A honeypot field, a minimum fill time, server and database input
  validation, and database throttles per salted IP hash (raw IPs are never stored). The throttles
  default to 15 attempts per 10 minutes and 5 reservations per day, and are adjustable in Settings.
- **"My gifts" — sign in with just your email.** Guests type the email they reserved with (no
  password, no code — the family's choice) and see every gift reserved with it, on any device; the
  device stays signed in, and reserving with an email signs you in automatically. It only ever
  shows gift, status and reference — never contact details — and nothing can be changed from it.
  Reservations made without an email still show on the device used (random device key, stored
  only as a SHA-256 hash).
- **Emails (optional, via your Gmail).** The family gets an email for every reservation; guests who
  give their email get a confirmation with a signed link that signs them in to My gifts. Emails are sent after the response,
  so they never slow down or undo a reservation.
- **Direct "Buy" links.** 37 gifts link straight to the exact product page at Mom Store, Mamas &
  Papas UAE, Mumzworld or Carrefour UAE (35 opened and checked; see docs/DATA_NOTES.md). Others
  open a search on the shop's own website. Nothing is invented: unchecked links say so.
- **Easy to use.** One-screen reservation form; the list shows gifts that are still available by
  default (with a live count), and price/sort/type filters live under "More filters".

## Quick start (local)

```bash
cd baby-registry
npm install
npx supabase start              # needs Docker; applies migrations incl. the 77-product import
cp .env.example .env.local      # fill with the values `npx supabase status` prints
npm run create-admin -- you@example.com
npm run dev                     # http://localhost:3000
```

## Project layout

```
baby-registry/
├─ data/wishlist.ts                 # source of truth for the PDF import (77 options, 7 categories)
├─ data/product-links.ts            # researched direct product links (source for the links migration)
├─ public/gifts/                    # photos cropped from the PDF's collages
├─ scripts/
│  ├─ generate-seed.ts              # data/wishlist.ts → supabase/migrations/…_import_wishlist.sql
│  ├─ extract-pdf-images.py         # crops the photos out of the PDF's collage images
│  └─ create-admin.ts               # creates/promotes an administrator
├─ supabase/migrations/
│  ├─ 20261116000100_registry_schema.sql   # tables, RLS, reservation functions, realtime, storage
│  ├─ 20261116000200_import_wishlist.sql   # generated product import (idempotent)
│  ├─ 20261117000100_guest_pledges.sql     # "My gifts": guest keys + get_guest_pledges()
│  └─ 20261117000200_product_links_and_peaches.sql  # generated: direct product links, shop search, "Baby Peaches"
├─ src/
│  ├─ app/(public)/…                # registry pages
│  ├─ app/admin/…                   # login, dashboard, exports
│  ├─ app/actions/                  # server actions (reserve, admin)
│  ├─ app/api/cron/…                # optional reservation-expiry job (off by default)
│  ├─ components/{registry,admin,site,ui}/
│  ├─ lib/                          # pricing, currency, filters, totals, links, validation, data access
│  └─ proxy.ts                      # Next 16 "proxy" (formerly middleware): admin session gate
└─ tests/{unit,db,e2e}/
```
