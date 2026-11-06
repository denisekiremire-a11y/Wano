-- bookings had zero indexes beyond its primary key and the booking_ref
-- unique constraint — every traveller/vendor/admin dashboard query filters
-- on traveller_id, listing_id, event_id or status, and the held/pending
-- expiry cron sweeps scan by status. None of that was indexed. See
-- schema.ts's bookings table for the per-index reasoning (same comments,
-- kept in sync here since drizzle-kit push can't express CREATE INDEX IF
-- NOT EXISTS the way this file needs for a safe re-run).

CREATE INDEX IF NOT EXISTS "bookings_traveller_idx" ON "bookings" ("traveller_id", "created_at");
CREATE INDEX IF NOT EXISTS "bookings_listing_idx" ON "bookings" ("listing_id", "status");
CREATE INDEX IF NOT EXISTS "bookings_event_idx" ON "bookings" ("event_id", "status");
CREATE INDEX IF NOT EXISTS "bookings_slot_idx" ON "bookings" ("slot_id", "status");
CREATE INDEX IF NOT EXISTS "bookings_status_idx" ON "bookings" ("status");
