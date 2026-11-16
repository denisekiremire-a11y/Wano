# Testing

Three layers, all run against real services, with nothing mocked:

| Suite | Command | Needs | Covers |
| --- | --- | --- | --- |
| Unit | `npm test` | nothing | PDF import completeness (all 77 rows, verbatim prices, no invented prices, alternatives, images present, migration in sync), currency conversion, price display, search/filter/sort, totals vs the PDF, where-to-buy links, CSV formula-injection safety, input validation |
| Database & security | `npm run test:db` | local Supabase | `reserve_gift` atomicity (**30 concurrent API calls** and **25 parallel open transactions** on one gift → exactly one succeeds), unique-index backstop, DB-side validation and sanitising, rate limits, public confirmation lookup reveals no contact details, RLS for anonymous / signed-in non-admin / admin users, admin purchase / cancel / release / status flows, status-change guard, delete guard, exchange-rate history, optional expiry (off by default), **Realtime** delivery to multiple sessions, and **no reservation data over Realtime** to guests |
| End-to-end | `npm run test:e2e` | local Supabase + running app | Real browsers: browsing, search, filters, sorting, category pages, Where-to-buy links, reserving without an account, confirmation page without PII, **a second browser updating live**, a guest told politely when someone else reserves first, **two browsers reserving simultaneously → one wins**, admin redirects/login/refusal of non-admins, guest details visible to the admin only, release & purchased propagating live, CSV export, setting the UGX rate (live), creating/editing/deleting a gift, adding a verified shopping link, mobile layout (no horizontal scroll) and reserving on a phone, budget page |

## Running locally

```bash
cd baby-registry
npm install
npx supabase start            # Docker required; prints URL + keys
# put API_URL / PUBLISHABLE_KEY / SECRET_KEY into .env.local (see .env.example)

npm test                      # unit
npx supabase db reset && npm run test:db
npx supabase db reset && npm run build && npm start &   # or: npm run dev
npm run test:e2e              # uses the Playwright/Chromium installed on the machine
```

Notes:

- The e2e suite expects a freshly reset database (all 77 gifts available) and creates and removes
  its own admin account.
- With `npm run dev`, open the site at `http://localhost:3000`, not `127.0.0.1`. Next 16's dev
  server blocks its development scripts for other origins.
- In an environment where GitHub's container registry is blocked, start Supabase with
  `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io npx supabase start`.

## Last verified results

- Unit: 37 passed
- Database & security: 34 passed
- End-to-end, against the production build (`next build && next start`): 24 passed, and passing
  on repeated runs
- `next build`, `eslint` and `tsc --noEmit`: clean
