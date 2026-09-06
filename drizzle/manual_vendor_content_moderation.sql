-- Vendor self-serve listings/rewards with admin approval, plus vendor posts.
-- Idempotent — safe to run multiple times.

DO $$ BEGIN
  CREATE TYPE "post_author_type" AS ENUM ('traveller', 'vendor');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "submission_entity_type" AS ENUM ('listing', 'reward');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "submission_status" AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "author_type" "post_author_type" NOT NULL DEFAULT 'traveller';
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "vendor_profile_id" uuid REFERENCES "vendor_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "posts" ALTER COLUMN "traveller_id" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "vendor_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "vendor_profile_id" uuid NOT NULL REFERENCES "vendor_profiles"("id") ON DELETE CASCADE,
  "entity_type" "submission_entity_type" NOT NULL,
  "entity_id" uuid,
  "payload" jsonb NOT NULL,
  "status" "submission_status" NOT NULL DEFAULT 'pending',
  "review_notes" text,
  "reviewed_by_user_id" uuid REFERENCES "users"("id"),
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
