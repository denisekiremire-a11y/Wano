-- Booking system rebuild: instant slot-capacity bookings alongside the
-- existing vendor-approval "request" flow. Purely additive — no existing
-- column is dropped or retyped, so every current booking/listing row stays
-- exactly as it reads today.

CREATE TYPE booking_mode AS ENUM ('instant', 'request');

ALTER TABLE listings ADD COLUMN booking_mode booking_mode NOT NULL DEFAULT 'instant';

-- Existing listings have no slots configured yet — instant mode with zero
-- slots means "nothing bookable", which would silently break every
-- existing partner's booking flow. Move them all to "request" (the exact
-- behavior they have today: pending, vendor confirms from their
-- dashboard) until a vendor actually sets up slots and switches the
-- listing to instant themselves.
UPDATE listings SET booking_mode = 'request';

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'held' AFTER 'pending';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'expired' AFTER 'cancelled';

CREATE TABLE IF NOT EXISTS slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  capacity integer NOT NULL,
  booked_count integer NOT NULL DEFAULT 0,
  is_blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS slots_listing_date_idx ON slots (listing_id, date);
CREATE INDEX IF NOT EXISTS slots_vendor_idx ON slots (vendor_id);

ALTER TABLE bookings ADD COLUMN slot_id uuid REFERENCES slots(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN held_until timestamptz;
ALTER TABLE bookings ADD COLUMN request_expires_at timestamptz;
ALTER TABLE bookings ADD COLUMN payment_ref text;
ALTER TABLE bookings ADD COLUMN flagged_for_support boolean NOT NULL DEFAULT false;

ALTER TABLE vendor_profiles ADD COLUMN vendor_cancellation_count integer NOT NULL DEFAULT 0;
