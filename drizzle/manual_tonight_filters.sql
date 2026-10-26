-- Vendor "tonight" line, home filters (engagement plan piece 7).
-- Additive only. Safe to run twice.
ALTER TABLE events ADD COLUMN IF NOT EXISTS price_from_minor integer;
ALTER TABLE events ADD COLUMN IF NOT EXISTS indoors boolean;

CREATE TABLE IF NOT EXISTS vendor_tonight_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_profile_id uuid NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  kampala_date date NOT NULL,
  text text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_profile_id, kampala_date)
);
CREATE INDEX IF NOT EXISTS vendor_tonight_updates_date_idx ON vendor_tonight_updates (kampala_date);
