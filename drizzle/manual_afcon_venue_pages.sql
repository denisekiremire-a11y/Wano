-- AFCON 2027 venue hub pages: lets a match (events.category = 'match') be
-- tied to one of the two Uganda venues for the /afcon/[venue] timetable.
-- Idempotent — safe to run multiple times.

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "venue_id" text;
