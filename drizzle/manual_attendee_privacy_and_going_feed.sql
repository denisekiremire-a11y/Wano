-- "Who's going" avatars on events/journeys/clubs (Luma Phase 1): a privacy
-- toggle for attendee lists, and a feed item type for "X is going to Y".
ALTER TABLE traveller_profiles ADD COLUMN IF NOT EXISTS hide_from_attendee_lists boolean NOT NULL DEFAULT false;

ALTER TYPE feed_item_type ADD VALUE IF NOT EXISTS 'going';
