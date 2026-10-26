-- Verified venue check-ins, backup visitor codes and weekly challenges.
CREATE TABLE IF NOT EXISTS venue_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  traveller_id uuid NOT NULL REFERENCES traveller_profiles(id) ON DELETE CASCADE,
  vendor_profile_id uuid NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  kampala_date date NOT NULL,
  area text,
  source text NOT NULL,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (traveller_id, vendor_profile_id, kampala_date)
);
CREATE INDEX IF NOT EXISTS venue_check_ins_traveller_idx ON venue_check_ins (traveller_id, checked_in_at);

CREATE TABLE IF NOT EXISTS visitor_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  traveller_id uuid NOT NULL REFERENCES traveller_profiles(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS visitor_code_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_profile_id uuid NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS visitor_code_failures_vendor_idx ON visitor_code_failures (vendor_profile_id, created_at);

CREATE TABLE IF NOT EXISTS weekly_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  slot text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  rule jsonb NOT NULL,
  xp integer NOT NULL,
  UNIQUE (week_start, slot)
);

CREATE TABLE IF NOT EXISTS weekly_challenge_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  traveller_id uuid NOT NULL REFERENCES traveller_profiles(id) ON DELETE CASCADE,
  weekly_challenge_id uuid NOT NULL REFERENCES weekly_challenges(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (traveller_id, weekly_challenge_id)
);
