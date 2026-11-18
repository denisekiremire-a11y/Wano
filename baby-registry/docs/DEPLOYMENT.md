# Deployment guide (Supabase + Vercel)

You need three free accounts: **GitHub** (where this code lives), **Supabase** (database, login,
real-time) and **Vercel** (hosting). Nothing in this repository is published or deployed until you
do these steps. Allow about 30–45 minutes.

> Commands below are run from the `baby-registry/` folder on your own computer, with Node.js 20+
> installed (`node -v`). Run `npm install` once first.

---

## 1. Create the Supabase project

1. Go to <https://supabase.com/dashboard> → **New project**.
2. Name it (e.g. `baby-registry`), set a strong **database password** and save it in your
   password manager. Pick the region closest to most of your guests.
3. Wait for the project to finish provisioning.
4. Open **Project Settings → API Keys** (or **Settings → API**) and note:
   - **Project URL**: `https://<project-ref>.supabase.co`
   - **Publishable key** (`sb_publishable_…`), which is browser-safe. On older projects use the
     legacy **anon** key instead.
   - **Secret key** (`sb_secret_…`), which is **server-only and must be kept secret**. On older
     projects use the legacy **service_role** key instead.
5. **Turn off public sign-ups:** **Authentication → Sign In / Providers → Allow new users to sign
   up → off.** Only accounts you create can sign in. (Even if someone did sign up, they would not
   be an administrator. Admin rights come only from the `admin_profiles` table.)

## 2. Run the database migrations

The two migration files create every table, security policy, function, the realtime publication
and the image storage bucket, and **import all 77 products from the PDF**.

**Option A, Supabase CLI (recommended):**

```bash
npx supabase login                         # opens a browser to authorise the CLI
npx supabase link --project-ref <project-ref>   # asks for the database password from step 1
npx supabase db push                       # applies supabase/migrations/*.sql in order
```

**Option B, dashboard only:** open **SQL Editor** and run each file in `supabase/migrations/`
**in order**, pasting the full contents into a new query each time:
`20261116000100_registry_schema.sql`, `20261116000200_import_wishlist.sql`,
`20261117000100_guest_pledges.sql`, `20261117000200_product_links_and_peaches.sql`,
`20261118000100_peekaboo_uganda.sql`.

> **Switching an existing registry to Peekaboo Uganda:** first release or cancel every active or
> purchased reservation (Admin → Reservations), then run `20261118000100_peekaboo_uganda.sql`. It
> refuses to run while any gift is still reserved, so nobody's pledge silently becomes a different
> product. It replaces all 77 gifts with their Peekaboo products, switches prices to UGX and
> removes the UAE shops.

> **Already deployed with only the first two files?** Run the other two, in this order:
> `20261117000100_guest_pledges.sql` ("My gifts"), then
> `20261117000200_product_links_and_peaches.sql` (direct product links, shop search pages and the
> "Baby Peaches" name). Until you do, reservations keep working; they just won't appear under My
> gifts, and Buy buttons fall back to searches.

## 3. Check the wishlist import

In the **SQL Editor** run:

```sql
select c.name, count(*) from gifts g join categories c on c.id = g.category_id
group by c.name, c.sort_order order by c.sort_order;
```

You should see Travel 7 · Sleep & nursery 14 · Bath & changing 10 · Health & grooming 5 ·
Feeding 7 · Clothing 16 · Extras & inspiration 18 (**77 total**). The import is idempotent:
re-running it never duplicates products or overwrites your edits.

## 4. Create your administrator account

Create `.env.local` (copy `.env.example`) and fill in `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SECRET_KEY` from step 1, then:

```bash
npm run create-admin -- you@example.com
```

It asks for a password (at least 12 characters) and prints `✔ … is now a registry administrator`.
Repeat for a partner's email if you want two admins. Running it again for an existing email
resets that account's password.

*Without the script:* **Authentication → Users → Add user → Create new user** (tick *Auto
Confirm User*), then in the SQL Editor run
`insert into admin_profiles (user_id) select id from auth.users where email = 'you@example.com';`

## 5. Configure environment variables

| Variable | Where it comes from | Exposed to browsers? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | Yes (safe) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (or legacy anon key as `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | Yes (safe; RLS protects data) |
| `SUPABASE_SECRET_KEY` | Secret key (or legacy service_role key as `SUPABASE_SERVICE_ROLE_KEY`) | **No.** Never prefix with `NEXT_PUBLIC_` |
| `RESERVATION_HASH_SALT` | Any long random string: `openssl rand -hex 32` | No |
| `CRON_SECRET` | Another long random string (only used if you enable reservation expiry) | No |

The secret key is used in exactly one place, the server-side reservation action. The code imports
it from a `server-only` module, so the build fails if it is ever pulled into browser code.

### Optional: emails from your Gmail (recommended)

With email switched on:
- **You** get an email for every reservation: gift, guest, contact details, message.
- **Guests who give their email** get a confirmation with a private link to *all* the gifts they've
  reserved with that address. It works on any phone or computer.
- (Guests can always see their list by typing their email on the My gifts page — that works
  even without email set up.)

Setup (about 10 minutes) — use the Gmail account you want emails to come from:

1. Turn on **2-Step Verification**: <https://myaccount.google.com/security> → *2-Step Verification*.
2. Create an **App Password**: <https://myaccount.google.com/apppasswords> → name it
   "Baby registry" → **Create**. Google shows a 16-letter password — copy it.
3. In **Vercel → your registry project → Settings → Environment Variables**, add (Production):
   - `SMTP_USER` = your Gmail address (e.g. `ourfamily@gmail.com`)
   - `SMTP_PASS` = the 16-letter App Password (type **Secret**)
   - *(optional)* `NOTIFY_OWNER_EMAIL` = where reservation alerts go, if not that Gmail
   - *(optional)* `EMAIL_FROM_NAME` = sender name, default "Baby Peaches Registry"
4. **Redeploy the newest Production deployment** so it picks up the new settings: **Deployments**
   → **⋯** on the *top* row → **Redeploy**. (Environment-variable changes only take effect after a
   deploy. Never redeploy an *older* row — that brings old code back.)
5. Test: reserve a gift with your own email. You should get two emails (the alert and the guest
   confirmation). Then release the test reservation in the admin.

Gmail allows roughly 500 emails a day, which is plenty for a family registry. To revoke access at
any time, delete the App Password in your Google account.

*Alternative:* [Resend](https://resend.com) — set `RESEND_API_KEY`; to email guests also verify
your own domain in Resend and set `NOTIFY_FROM_EMAIL`, e.g. `Baby Registry <registry@yourfamily.com>`.

## 6. Deploy to Vercel

This app lives in the `baby-registry/` folder of the `Wano` repository, so it gets **its own**
Vercel project, separate from any existing Wano deployment.

1. <https://vercel.com/new> → **Import** the `Wano` GitHub repository.
2. **Root Directory → `baby-registry`** (important). Framework preset: **Next.js** (auto-detected).
3. **Environment Variables:** add all five variables from step 5 (plus the optional email ones) (Production, and Preview if you
   use preview deployments).
4. **Deploy.** When it finishes you get a URL like `https://baby-registry-xyz.vercel.app`.
5. *(Optional)* `vercel.json` schedules a daily call to `/api/cron/expire-reservations`. It does
   nothing unless you turn on reservation expiry in Admin → Settings, and Vercel sends
   `CRON_SECRET` automatically.

In **Supabase → Authentication → URL Configuration**, set **Site URL** to your final address
(from step 8, or the vercel.app URL until then).

## 7. Prices are in UGX

All prices come from Peekaboo Uganda in Ugandan shillings; there is no exchange rate to set.
To update a price, use **Admin → Gifts → Edit**.

## 8. Connect a custom domain (optional)

1. Vercel project → **Settings → Domains → Add**, e.g. `registry.yourfamily.com`.
2. At your domain registrar, add the DNS record Vercel shows (usually a `CNAME` to
   `cname.vercel-dns.com` for a subdomain, or an `A` record for an apex domain).
3. Wait for Vercel to show **Valid Configuration**. HTTPS is issued automatically.
4. Update **Supabase → Authentication → URL Configuration → Site URL** to the new domain.

## 9. Test the public link before sharing

Open the site on your phone **and** a laptop at the same time:

- [ ] The homepage shows 77 gifts and the progress card says **Live — updates instantly**.
- [ ] Search “bjorn” finds the BabyBjörn Bouncer; category chips and filters work.
- [ ] Reserve a gift on the phone with a test name. You land on a confirmation page with a
      `GIFT-XXXXX-XXXXX` reference, and the laptop shows the gift as **Reserved** without reloading.
- [ ] Open **Where to buy** on a gift; the links open Google / Google Maps in a new tab.
- [ ] In `/admin/reservations` you see the test reservation with its details. **Release** it, and
      the gift becomes available again on both devices.
- [ ] In a private/incognito window, `/admin` redirects to the login page.

Then share the homepage link with family and friends.

---

### Updating later

- **Code changes:** push to the branch Vercel deploys from; Vercel redeploys automatically.
- **Database changes:** add a new file in `supabase/migrations/` and run `npx supabase db push`.
- **Backups:** Supabase takes daily backups on paid plans. On the free plan, use the CSV exports in
  the admin dashboard occasionally.
- **Free-tier note:** free Supabase projects pause after a period of inactivity. If the registry
  stops loading, open the Supabase dashboard and **Restore** the project. Upgrade if you want to
  avoid this during the gifting period.
