-- Rewards v2: RLS for the new points_ledger table.
--
-- Every other rewards-v2 change (rewards' min_bill_minor/wano_share_pct/
-- total_cap/per_user_cap/starts_at/ends_at/status, user_rewards'
-- bill_amount_minor/discount_amount_minor/void_reason/voided_by_user_id,
-- the two new reward_discount_type values, the reward_status enum, and
-- the points_ledger table itself) is fully expressed in src/db/schema.ts
-- and applied by `drizzle-kit push` like any ordinary schema change —
-- run that (`npm run db:push`) before this file, same order as always.
-- RLS policies are the one thing drizzle-kit categorically can't express
-- (same reason manual_rls_round_a.sql/manual_rls_round_b.sql exist), so
-- that's all that's left here.
--
-- A traveller reads only their own ledger; every write (referral awards,
-- points-type redemptions, manual admin adjustments) goes through
-- withRlsContext({role: "admin"}) as a trusted-system write, same
-- reasoning as mintUserReward — so INSERT is admin-only. Nothing ever
-- updates or deletes a row (corrections are new reversing rows), so
-- there's no UPDATE/DELETE policy at all — FORCE ROW LEVEL SECURITY with
-- no matching policy denies both outright.
--
-- rewards/user_rewards already have Round B row-level policies that cover
-- their new columns unchanged (RLS is row-level, not column-level, so no
-- new policy is needed there for this round).
--
-- IMPORTANT — same caveat as Round A/B: FORCE ROW LEVEL SECURITY has no
-- effect on a Postgres superuser connection. Confirm your production
-- DATABASE_URL role is not a superuser before treating this as real
-- protection.
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger FORCE ROW LEVEL SECURITY;

CREATE POLICY points_ledger_select_own_or_admin ON points_ledger FOR SELECT USING (
  current_setting('app.role', true) = 'admin'
  OR traveller_id = NULLIF(current_setting('app.traveller_profile_id', true), '')::uuid
);

CREATE POLICY points_ledger_insert_admin ON points_ledger FOR INSERT WITH CHECK (
  current_setting('app.role', true) = 'admin'
);
