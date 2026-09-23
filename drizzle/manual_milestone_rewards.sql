-- Milestone rewards: crossing a points threshold auto-grants a voucher.
ALTER TYPE reward_source ADD VALUE IF NOT EXISTS 'milestone';
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS milestone_threshold integer;
ALTER TABLE traveller_profiles ADD COLUMN IF NOT EXISTS milestone_points_claimed integer NOT NULL DEFAULT 0;
