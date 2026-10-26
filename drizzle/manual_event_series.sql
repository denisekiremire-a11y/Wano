-- Weekly regulars: every occurrence of a repeating event shares a series_id.
-- Each week stays its own events row, so nothing else changes.
ALTER TABLE events ADD COLUMN IF NOT EXISTS series_id uuid;
CREATE INDEX IF NOT EXISTS events_series_id_idx ON events (series_id) WHERE series_id IS NOT NULL;
