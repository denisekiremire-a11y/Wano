-- Crews (shared Passport) and creator lists (engagement plan piece 8).
-- Additive only. Safe to run twice.
ALTER TABLE traveller_profiles ADD COLUMN IF NOT EXISTS creator_approved_at timestamptz;

CREATE TABLE IF NOT EXISTS crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_token text NOT NULL UNIQUE,
  created_by_id uuid REFERENCES traveller_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS crew_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  traveller_id uuid NOT NULL UNIQUE REFERENCES traveller_profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crew_members_crew_idx ON crew_members (crew_id);

CREATE TABLE IF NOT EXISTS creator_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES traveller_profiles(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  intro text NOT NULL DEFAULT '',
  area text,
  status text NOT NULL DEFAULT 'draft',
  review_note text,
  submitted_at timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creator_lists_author_idx ON creator_lists (author_id);
CREATE INDEX IF NOT EXISTS creator_lists_status_idx ON creator_lists (status);
CREATE TABLE IF NOT EXISTS creator_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES creator_lists(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  note text,
  position integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS creator_list_items_list_idx ON creator_list_items (list_id);
