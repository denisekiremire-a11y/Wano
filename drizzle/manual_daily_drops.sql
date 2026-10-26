-- Daily Drop: one vendor-funded perk per Kampala date (see dailyDrops in
-- src/db/schema.ts). The perk is a normal rewards row with source 'drop'.
ALTER TYPE reward_source ADD VALUE IF NOT EXISTS 'drop';

CREATE TABLE IF NOT EXISTS daily_drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_date date NOT NULL UNIQUE,
  reward_id uuid NOT NULL UNIQUE REFERENCES rewards(id) ON DELETE CASCADE,
  claims_open_at timestamptz NOT NULL,
  redeem_from timestamptz NOT NULL,
  redeem_until timestamptz NOT NULL,
  created_by_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
