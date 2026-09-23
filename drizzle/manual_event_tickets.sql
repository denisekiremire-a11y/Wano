-- Extends the booking/menu system to standalone events (the /events
-- calendar), reusing the same listing_items/booking_items tables: a
-- ticket tier is a listing_item with eventId set instead of listingId,
-- and a ticket purchase is a bookings row with eventId set instead of
-- listingId. Match Day keeps its separate xp_bookings/xp_draws system
-- untouched.

ALTER TABLE "listing_items" ALTER COLUMN "listing_id" DROP NOT NULL;
ALTER TABLE "listing_items" ADD COLUMN IF NOT EXISTS "event_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listing_items_event_id_events_id_fk'
  ) THEN
    ALTER TABLE "listing_items"
      ADD CONSTRAINT "listing_items_event_id_events_id_fk"
      FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "bookings" ALTER COLUMN "listing_id" DROP NOT NULL;
