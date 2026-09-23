-- Points shop: travellers spend points on a reward they pick, replacing
-- the automatic milestone ladder shipped the round before this.
ALTER TYPE reward_source RENAME VALUE 'milestone' TO 'points_shop';
ALTER TABLE rewards RENAME COLUMN milestone_threshold TO points_cost;
ALTER TABLE traveller_profiles DROP COLUMN IF EXISTS milestone_points_claimed;

CREATE TABLE IF NOT EXISTS point_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  traveller_id uuid NOT NULL REFERENCES traveller_profiles(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  points_cost integer NOT NULL,
  user_reward_id uuid REFERENCES user_rewards(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
