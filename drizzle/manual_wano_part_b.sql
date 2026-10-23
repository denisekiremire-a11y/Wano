-- Wano additions Part B: RLS for the one new table this round adds.
--
-- Every column/table this round introduces (travellerProfiles.phone_
-- verified_at, vendorProfiles.paid_bookings_pilot, bookings.points_
-- applied_minor, and the price_match_reports table itself) is fully
-- expressed in src/db/schema.ts and applied by `drizzle-kit push` like
-- any ordinary schema change — run that (`npm run db:push`) before this
-- file, same order as always. RLS policies are the one thing drizzle-kit
-- categorically can't express (same reason every other manual_rls_*.sql
-- file exists), so that's all that's left here.
--
-- price_match_reports is traveller-owned, and (unlike most tables this
-- codebase RLS-protects) genuinely inserted directly by the traveller
-- themselves, not a trusted-system write — same shape as Round A's posts
-- table. Review fields (status/credited_points/reviewed_by_user_id/
-- reviewed_at) are only ever written by an admin action, so UPDATE is
-- admin-only; there's no DELETE policy at all (nothing in the app ever
-- deletes a report), which with FORCE ROW LEVEL SECURITY denies it
-- outright.
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

ALTER TABLE price_match_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_match_reports FORCE ROW LEVEL SECURITY;

CREATE POLICY price_match_reports_select_own_or_admin ON price_match_reports FOR SELECT USING (
  current_setting('app.role', true) = 'admin'
  OR traveller_id = NULLIF(current_setting('app.traveller_profile_id', true), '')::uuid
);

CREATE POLICY price_match_reports_insert_own ON price_match_reports FOR INSERT WITH CHECK (
  current_setting('app.role', true) = 'admin'
  OR traveller_id = NULLIF(current_setting('app.traveller_profile_id', true), '')::uuid
);

CREATE POLICY price_match_reports_update_admin ON price_match_reports FOR UPDATE USING (
  current_setting('app.role', true) = 'admin'
) WITH CHECK (
  current_setting('app.role', true) = 'admin'
);

-- phone_verification_codes: same "admin-only, the real access control is
-- the raw code value itself" reasoning as email_verification_tokens — the
-- sending/verifying actions run under withRlsContext({role: "admin"})
-- after their own requireRole("traveller") + ownership checks, same
-- trusted-system-write pattern used throughout this file.
ALTER TABLE phone_verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_verification_codes FORCE ROW LEVEL SECURITY;

CREATE POLICY phone_verification_codes_admin_only ON phone_verification_codes FOR ALL USING (
  current_setting('app.role', true) = 'admin'
) WITH CHECK (
  current_setting('app.role', true) = 'admin'
);
