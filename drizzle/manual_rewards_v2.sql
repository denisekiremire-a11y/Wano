-- Rewards v2: caps/windows/status on rewards, redemption bill/discount
-- tracking + void reason on user_rewards, and a new append-only points
-- ledger (a second, separate points concept from the live-computed
-- Passport points in getRewardsSummary — see the block comment above
-- `rewards` in src/db/schema.ts).
--
-- ALTER TYPE ... ADD VALUE cannot run inside the same transaction as a
-- statement that uses the new value, so this file deliberately never
-- references 'spend_perk'/'points'/any reward_status value in the same
-- statement batch that adds it. Run this file's statements in order, in
-- one psql session (each top-level statement auto-commits its own
-- implicit transaction unless wrapped — do not wrap this whole file in a
-- single explicit BEGIN/COMMIT).

-- ── reward_discount_type: two new values ────────────────────────────────
ALTER TYPE reward_discount_type ADD VALUE IF NOT EXISTS 'spend_perk';
ALTER TYPE reward_discount_type ADD VALUE IF NOT EXISTS 'points';

-- ── reward_status: new enum ─────────────────────────────────────────────
CREATE TYPE reward_status AS ENUM ('draft', 'active', 'paused', 'expired');

-- ── rewards: caps, window, funding split, status ────────────────────────
ALTER TABLE rewards
  ADD COLUMN min_bill_minor integer,
  ADD COLUMN wano_share_pct integer CHECK (wano_share_pct BETWEEN 0 AND 100),
  ADD COLUMN total_cap integer,
  ADD COLUMN per_user_cap integer NOT NULL DEFAULT 1,
  ADD COLUMN starts_at timestamptz,
  ADD COLUMN ends_at timestamptz,
  ADD COLUMN status reward_status NOT NULL DEFAULT 'active';

-- Backfill status from the existing `active` boolean — active stays as a
-- column (funzone-actions.ts/xp-actions.ts read it directly), kept in sync
-- with status by app code going forward rather than removed.
UPDATE rewards SET status = 'paused' WHERE active = false;

-- ── user_rewards: redemption amounts + void reason ──────────────────────
ALTER TABLE user_rewards
  ADD COLUMN bill_amount_minor integer,
  ADD COLUMN discount_amount_minor integer,
  ADD COLUMN void_reason text,
  ADD COLUMN voided_by_user_id uuid REFERENCES users(id);

-- ── points_ledger: append-only, balance = SUM(delta) ────────────────────
CREATE TABLE points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  traveller_id uuid NOT NULL REFERENCES traveller_profiles(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,
  source_type text NOT NULL,
  source_id uuid,
  created_by_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX points_ledger_traveller_created_idx ON points_ledger (traveller_id, created_at);

-- ── RLS Round C: points_ledger only — rewards/user_rewards already have
-- Round B row-level policies that cover their new columns unchanged (RLS
-- is row-level, not column-level, so no new policy is needed there).
-- A traveller reads only their own ledger; every write (referral awards,
-- points-type redemptions, manual admin adjustments) goes through
-- withRlsContext({role: "admin"}) as a trusted-system write, same
-- reasoning as mintUserReward — so INSERT is admin-only. Nothing ever
-- updates or deletes a row (corrections are new reversing rows), so
-- there's no UPDATE/DELETE policy at all — FORCE ROW LEVEL SECURITY with
-- no matching policy denies both outright.
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
