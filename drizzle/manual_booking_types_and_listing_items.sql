-- Phase 1 of the booking/menu redesign: 3 new listing types, a generic
-- listing_items table (menu/services/rooms/vehicles/tickets), per-item
-- images, per-booking line items, and the new bookings columns they need.

ALTER TYPE "listing_type" ADD VALUE IF NOT EXISTS 'attraction';
ALTER TYPE "listing_type" ADD VALUE IF NOT EXISTS 'event';
ALTER TYPE "listing_type" ADD VALUE IF NOT EXISTS 'rental';

CREATE TABLE IF NOT EXISTS "listing_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "listing_id" uuid NOT NULL,
  "section_label" text,
  "name" text NOT NULL,
  "description" text,
  "price_minor" integer,
  "price_unit" text,
  "duration_text" text,
  "capacity_text" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "listing_items_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "listing_item_images" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "item_id" uuid NOT NULL,
  "data" bytea NOT NULL,
  "mime_type" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "listing_item_images_item_id_listing_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "listing_items"("id") ON DELETE CASCADE
);

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "end_date" date;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pickup_location" text;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "dropoff_location" text;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "children_count" integer;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "subtotal_minor" integer;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "total_minor" integer;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "details" jsonb;

CREATE TABLE IF NOT EXISTS "booking_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "booking_id" uuid NOT NULL,
  "listing_item_id" uuid,
  "name_at_booking" text NOT NULL,
  "price_minor_at_booking" integer,
  "quantity" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "booking_items_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE,
  CONSTRAINT "booking_items_listing_item_id_listing_items_id_fk" FOREIGN KEY ("listing_item_id") REFERENCES "listing_items"("id") ON DELETE SET NULL
);

ALTER TABLE "restaurant_details" ADD COLUMN IF NOT EXISTS "allows_preorder" boolean DEFAULT false NOT NULL;
