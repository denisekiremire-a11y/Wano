# Pamoja 2027

The discovery and booking hub for AFCON 2027 fans in Uganda — five curated journeys, UTB-accredited
partners (hotels, tour operators, transport), and the Pearl of Africa Passport loyalty mechanic.

UTB curates and markets; it does not operate travel itself. Every booking recorded by this app is a
referral/contract between a traveller and an accredited partner, not a transaction fulfilled by the
platform.

## Stack

- **Next.js 16** (App Router, Turbopack, TypeScript) — note the app uses `src/proxy.ts` (Next 16's
  renamed `middleware.ts`) for route protection.
- **Drizzle ORM + Postgres** (`postgres.js` driver)
- **Auth**: custom email/password with bcrypt + signed JWT session cookies (`src/lib/session.ts`,
  `src/lib/auth.ts`) — deliberately lightweight so social login/payment providers can be layered on
  later without ripping out an auth library.
- **Tailwind CSS v4** with a custom forest-green / marigold / Nile-blue theme (`src/app/globals.css`).

## Getting started

1. **Start a Postgres database.** Either run the bundled one:

   ```bash
   docker compose up -d
   ```

   or point `DATABASE_URL` at any managed Postgres (Neon, Supabase, RDS, etc).

2. **Configure environment variables:**

   ```bash
   cp .env.example .env.local
   # then edit .env.local — set DATABASE_URL and generate an AUTH_SECRET:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Install dependencies** (already done if you're continuing this session):

   ```bash
   npm install
   ```

4. **Push the schema and seed demo data:**

   ```bash
   npm run db:push
   npm run db:seed
   ```

   The seed script creates the 5 fixed journeys, 3 challenges, 5 demo accredited partners
   (one pending accreditation), and demo accounts — all with password `WanoLocalDev-9214!`
   (local dev only; see `src/db/seed.ts` if you change it):
   - Traveller: `amina@example.com` (already has 2 of 5 stamps)
   - Vendor: `jinja.nile.resort@example.com` (and 4 others — see `src/db/seed.ts`)
   - Admin: `admin@wano.app`

   These credentials are for a local database only — never rendered on any page, and never
   the credentials for the live/production deployment.

5. **Run the dev server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Data model

See `src/db/schema.ts`. Summary: `users` (role: traveller/vendor/admin) → `traveller_profiles` /
`vendor_profiles`; fixed `journeys` (seeded, not user-creatable) have many `listings`, each with one
`offer`; `bookings` are the referral/contract record and are what mint a `stamp` (unique per
traveller+journey); `challenges` / `challenge_completions` track bonus perks.

## Key directories

- `src/lib/data/*` — read queries per domain (journeys, traveller, vendor, admin)
- `src/lib/actions/*` — server actions (auth, booking, challenges, vendor offer, admin approval)
- `src/proxy.ts` — role-based route protection (`/dashboard`, `/vendor/dashboard`, `/admin`)
- `src/app/manifest.ts`, `src/app/icon.tsx` — installable PWA config (bottom tab nav is in
  `src/components/bottom-nav.tsx`, shown below `md` breakpoint)

## Not yet wired up

Payments and the actual booking-fulfillment integration were intentionally left out — that depends
on which accredited partners' systems get integrated, per the original brief. `estimatedCommission`
on bookings is currently a flat placeholder value set in `src/lib/actions/booking-actions.ts`.
