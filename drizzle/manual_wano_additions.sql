-- Wano additions (Part A): RLS for the three new tables this round adds.
--
-- Every column/table this round introduces (users.email_verified_at,
-- email_verification_tokens, vendor_profiles.best_price_on_wano,
-- listings.wano_only_extras, rewards.collab_trigger_vendor_profile_id,
-- the "collab" reward_source value, trails, trail_listings,
-- trail_completions) is fully expressed in src/db/schema.ts and applied
-- by `drizzle-kit push` like any ordinary schema change — run that
-- (`npm run db:push`) before this file, same order as always. RLS
-- policies are the one thing drizzle-kit categorically can't express
-- (same reason every other manual_rls_*.sql file exists), so that's all
-- that's left here. Re-creating anything drizzle-kit already creates is
-- exactly the bug that broke CI for points_ledger's RLS last round — see
-- manual_rewards_v2.sql's header.
--
-- trails / trail_listings: admin-managed catalog + join table, no
-- traveller/vendor owner column — same shape as Round B's rewards policy
-- (any authenticated read, admin-only write).
--
-- trail_completions: traveller-owned, but a traveller never writes their
-- own completion row directly — it's always minted by the trusted-system
-- booking-completion cron (same reasoning as Round B's stamps table), so
-- reads are traveller-own-or-admin, writes are admin-context-only.
--
-- email_verification_tokens: looked up by raw token value from an
-- unauthenticated verify-link click, so the lookup/consume action runs
-- under withRlsContext({role: "admin"}) — same trusted-system-write
-- reasoning already used for voucher-code lookup
-- (lookupRewardByCodeForVendor). Admin-only for everything; there is no
-- legitimate traveller-session read of this table at all.
--
-- Same session-variable mechanism as every prior round (see
-- manual_rls_round_a.sql and src/lib/db-context.ts) — app.role /
-- app.vendor_profile_id / app.traveller_profile_id, set transaction-local
-- by withRlsContext.
--
-- IMPORTANT — same caveat as every prior round: FORCE ROW LEVEL SECURITY
-- has NO EFFECT on a Postgres superuser connection, only on a
-- non-superuser table owner. Confirm your production DATABASE_URL role is
-- not a superuser before treating this as real protection.

-- ── trails ──────────────────────────────────────────────────────────────
ALTER TABLE trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE trails FORCE ROW LEVEL SECURITY;

CREATE POLICY trails_select_any_authenticated ON trails FOR SELECT USING (
  NULLIF(current_setting('app.role', true), '') IS NOT NULL
);

CREATE POLICY trails_insert_admin ON trails FOR INSERT WITH CHECK (
  current_setting('app.role', true) = 'admin'
);

CREATE POLICY trails_update_admin ON trails FOR UPDATE USING (
  current_setting('app.role', true) = 'admin'
) WITH CHECK (
  current_setting('app.role', true) = 'admin'
);

-- ── trail_listings ──────────────────────────────────────────────────────
ALTER TABLE trail_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trail_listings FORCE ROW LEVEL SECURITY;

CREATE POLICY trail_listings_select_any_authenticated ON trail_listings FOR SELECT USING (
  NULLIF(current_setting('app.role', true), '') IS NOT NULL
);

CREATE POLICY trail_listings_insert_admin ON trail_listings FOR INSERT WITH CHECK (
  current_setting('app.role', true) = 'admin'
);

CREATE POLICY trail_listings_delete_admin ON trail_listings FOR DELETE USING (
  current_setting('app.role', true) = 'admin'
);

-- ── trail_completions ───────────────────────────────────────────────────
ALTER TABLE trail_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trail_completions FORCE ROW LEVEL SECURITY;

CREATE POLICY trail_completions_select_own_or_admin ON trail_completions FOR SELECT USING (
  current_setting('app.role', true) = 'admin'
  OR traveller_id = NULLIF(current_setting('app.traveller_profile_id', true), '')::uuid
);

CREATE POLICY trail_completions_insert_admin ON trail_completions FOR INSERT WITH CHECK (
  current_setting('app.role', true) = 'admin'
);

-- ── email_verification_tokens ───────────────────────────────────────────
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens FORCE ROW LEVEL SECURITY;

CREATE POLICY email_verification_tokens_admin_only ON email_verification_tokens FOR ALL USING (
  current_setting('app.role', true) = 'admin'
) WITH CHECK (
  current_setting('app.role', true) = 'admin'
);
