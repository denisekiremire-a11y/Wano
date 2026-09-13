-- AFCON 2027 season skin: fixtures table (empty until CAF makes the draw —
-- the app falls back to placeholder fixtures until then).
-- Idempotent — safe to run multiple times.

CREATE TABLE IF NOT EXISTS "fixtures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "home" text NOT NULL,
  "away" text NOT NULL,
  "kickoff" timestamp with time zone NOT NULL,
  "venue_id" text NOT NULL,
  "venue" text NOT NULL,
  "stage" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
