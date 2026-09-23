-- Phase 2 rewards redesign: tracks when a vendor scans/enters an event
-- ticket at the door. Separate from bookings.status.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;
