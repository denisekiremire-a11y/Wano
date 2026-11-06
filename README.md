# Wano

A Kampala-focused discovery, booking and rewards app for travellers in Uganda — browse and book
hotels, restaurants, tours/experiences, transport, spas, attractions and rentals from Wano-verified
vendors, earn Passport stamps and points, and redeem rewards. Every listing type stays pay-at-venue
today; a behind-a-flag paid-bookings pilot (Flutterwave, with Pesapal planned next) is layered on top
without changing that default. AFCON 2027 content (club pages, match tickets, venue pages) lives
behind its own flag and reuses the same booking/rewards machinery rather than a parallel system.

## Stack

- **Next.js 16** (App Router, Turbopack, TypeScript) — note the app uses `src/proxy.ts` (Next 16's
  renamed `middleware.ts`) for route protection.
- **Drizzle ORM + Postgres** (`postgres.js` driver), with Postgres Row-Level Security as a second,
  database-enforced layer under the app's own server-side authorization checks. See
  [RLS and database migrations](#rls-and-database-migrations) below — this is the part most likely to
  trip up a new environment.
- **Auth**: custom email/password with bcrypt + signed JWT session cookies (`src/lib/session.ts`,
  `src/lib/auth.ts`), email verification, WhatsApp/SMS phone verification, and self-service password
  reset — deliberately lightweight (no third-party auth provider) so it stays easy to reason about.
- **Payments**: Flutterwave, currently wired up for Wano XP paid match seats only (everything else
  stays pay-at-venue). A Pesapal integration for a broader paid-bookings pilot is planned as a
  separate workstream, behind the same `PAID_BOOKINGS_ENABLED` kill switch.
- **Notifications**: email via Resend (console-log stub when unconfigured, see below), WhatsApp via
  Wati's WhatsApp Business API (`src/lib/whatsapp.ts`) for phone verification and reminders.
- **Mobile**: Capacitor wraps the live Next.js site for Android and iOS (`capacitor.config.ts`) — this
  is a server-rendered app with server actions and live cookies, not a static export, so the native
  shell loads the deployed site at runtime rather than bundling a build.
- **Tailwind CSS v4** with a custom forest-green / marigold / Nile-blue theme (`src/app/globals.css`).
- **Vercel** for hosting, Vercel Cron for the scheduled jobs under `src/app/api/cron/*`, **Neon**
  for managed Postgres in production.

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

4. **Push the schema, apply RLS, and seed demo data:**

   ```bash
   npm run db:push
   # then every file in drizzle/manual_*.sql, in the order described below —
   # db:push alone does not set up RLS or any other non-schema.ts SQL
   npm run db:seed
   npm run db:seed:wano
   ```

   (`db:seed:birthday`, `db:seed:journal` and `db:seed:clubs` add more optional demo content for
   those specific features — not required for a basic local setup.)

   The seed scripts create the 5 fixed journeys, demo challenges, a handful of demo accredited
   vendors (one pending accreditation), and demo accounts — all with password
   `WanoLocalDev-9214!` (local dev only; see `src/db/seed.ts` if you change it):
   - Traveller: `amina@example.com` (already has 2 of 5 stamps)
   - Vendor: `jinja.nile.resort@example.com` (and several others — see `src/db/seed.ts`)
   - Admin: `admin@wano.app`

   These credentials are for a local database only — never rendered on any page, and never
   the credentials for the live/production deployment.

5. **Run the dev server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

6. **(Optional) Admin email notifications.** The admin gets an email whenever someone signs up
   (traveller or vendor), a vendor submits an accreditation document, or someone submits/applies
   to start a club. This works out of the box in a sort of way — without any setup it just logs the
   email to the server console instead of sending it, so nothing breaks, but nothing actually
   arrives anywhere either. To get real emails:

   - Sign up at [resend.com](https://resend.com) (free tier is plenty for this) and grab an API key
     from **API Keys** in the dashboard.
   - Set `RESEND_API_KEY` in `.env.local` (and in your Vercel project's environment variables for
     production).
   - By default notifications go to `denisekiremire@gmail.com` (same as the site's public support
     address) — set `ADMIN_NOTIFICATION_EMAIL` to change that.
   - By default they're sent from Resend's shared `onboarding@resend.dev` address, which only
     delivers to the email on your own Resend account. To send to any address, verify a real domain
     under **Domains** in Resend, then set `EMAIL_FROM` to an address on that domain (e.g.
     `Wano <notifications@yourdomain.com>`).
   - Set `NEXT_PUBLIC_APP_URL` to your real deployed URL so the links inside notification emails
     (e.g. "review this vendor", a password reset link) point somewhere real instead of
     `localhost:3000`.

## RLS and database migrations

**There is no deploy-time migration step anywhere in this project.** `npm run db:push` (via
`drizzle-kit push`) applies everything expressed in `src/db/schema.ts` — tables, columns, enums,
indexes — but it cannot express Postgres Row-Level Security policies, so those live as plain SQL in
`drizzle/manual_*.sql`, one file per feature round, applied in filename order (see
`.github/workflows/ci.yml` for the exact order CI uses). **Running `db:push` against a fresh
database is not enough on its own** — every `manual_*.sql` file also needs to be run by hand against
that same database (`psql "$DATABASE_URL" -f drizzle/manual_xxx.sql` for each, in order), including
against whatever database any Vercel deployment (production or preview) actually connects to. Forgetting
this for a new feature is a recurring, concrete failure mode in this project — it has caused both
silent runtime crashes (a table or column genuinely doesn't exist on whatever database is backing a
deployment) and, when the missing column is touched during static generation (e.g. `/sitemap.xml`),
full Vercel build failures. When you add a table or column, check whether it also needs RLS (almost
everything holding user data does) and add it to a new or existing `manual_*.sql` file.

## Data model

See `src/db/schema.ts`. Summary: `users` (role: traveller/vendor/admin) → `traveller_profiles` /
`vendor_profiles`; `listings` are polymorphic by type (hotel/restaurant/experience/transport/
spa_salon/attraction/rental/event), each with one `offer` and a type-specific detail table
(`hotel_details`, `restaurant_details`, `experience_details`); `bookings` are real transactional
records — slot-based instant bookings (capacity-checked and serialized with a Postgres advisory
transaction lock, see `src/lib/slot-booking.ts`), request-to-book (vendor confirms within a window),
or a standalone event-ticket purchase — and are what mint a `stamp` (unique per traveller+journey).
`vendor_submissions` is the review queue every new/edited vendor listing goes through before it's
live; `points_ledger` and `rewards`/`user_rewards` back the points/voucher system; `feed_items` is
the activity feed. Fixed `journeys` (seeded, not user-creatable) group listings into the five
curated itineraries the Passport tracks stamps against.

## Key directories

- `src/lib/data/*` — read queries per domain (journeys, traveller, vendor, admin, rewards, events)
- `src/lib/actions/*` — server actions (auth, booking, vendor listings, admin approval, rewards,
  moderation, phone/email/password-reset verification, …)
- `src/lib/slot-booking.ts` — the capacity-safe instant-booking engine (advisory locks, hold
  expiry, cancellation)
- `src/proxy.ts` — role-based route protection (`/dashboard`, `/vendor/dashboard`, `/admin`) — a
  fast redirect layer only; the actual authorization check happens server-side in `src/lib/auth.ts`,
  re-read fresh from the database on every call rather than trusted from the session cookie
- `src/app/api/cron/*` — scheduled jobs (hold/request/reward/points expiry, feed generation, XP
  payment expiry), authenticated via `CRON_SECRET` (see `src/lib/cron-auth.ts`)
- `src/app/manifest.ts`, `src/app/icon.tsx` — installable PWA config (bottom tab nav is in
  `src/components/bottom-nav.tsx`, shown below `md` breakpoint)
- `capacitor.config.ts` — native Android/iOS shell config, loads the live deployed site

## Feature flags

`src/lib/feature-flags.ts` is the single place deciding what's switched on — each is a
`NEXT_PUBLIC_<NAME>_ENABLED` environment variable backing a plain exported boolean, so a feature can
be disabled without a code change. Currently: `AFCON_CLUB_ENABLED` (AFCON 2027 club/venue content)
and `PAID_BOOKINGS_ENABLED` (the Flutterwave paid-bookings pilot — every booking stays pay-at-venue
regardless of this flag; it only ever changes what happens once a booking that opted in is paid and
completed, and also gates phone-verification enforcement on booking, since that requirement was
scoped to the paid pilot specifically).
