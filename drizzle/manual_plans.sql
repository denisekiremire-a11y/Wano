-- Plans, invites and group bookings (engagement plan piece 6).
-- Additive only. Safe to run twice.
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES traveller_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  note text,
  invite_token text NOT NULL UNIQUE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plans_creator_idx ON plans (creator_id);

CREATE TABLE IF NOT EXISTS plan_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  traveller_id uuid NOT NULL REFERENCES traveller_profiles(id) ON DELETE CASCADE,
  status text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, traveller_id)
);
CREATE INDEX IF NOT EXISTS plan_members_traveller_idx ON plan_members (traveller_id);

CREATE TABLE IF NOT EXISTS booking_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  traveller_id uuid NOT NULL REFERENCES traveller_profiles(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES plans(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, traveller_id)
);
CREATE INDEX IF NOT EXISTS booking_guests_traveller_idx ON booking_guests (traveller_id);
