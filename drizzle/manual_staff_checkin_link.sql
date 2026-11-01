-- Login-free staff link (wano.app/staff/{token}) — PR adds staffAccessToken
-- to vendor_profiles and a new staff_pin_failures rate-limit table in
-- schema.ts, but shipped no SQL for either. Written the same way as every
-- other manual_*.sql file in this directory: a single self-contained
-- script to run against the real (Neon) database, since nothing in the
-- build/deploy pipeline runs drizzle-kit push against it automatically.

ALTER TABLE "vendor_profiles" ADD COLUMN IF NOT EXISTS "staff_access_token" text UNIQUE;

CREATE TABLE IF NOT EXISTS "staff_pin_failures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "vendor_profile_id" uuid NOT NULL REFERENCES "vendor_profiles"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "staff_pin_failures_vendor_idx" ON "staff_pin_failures" ("vendor_profile_id", "created_at");
