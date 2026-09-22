-- Stories: 24h-expiring photos with a seen/unseen viewer ring, shown at
-- the top of /social. Same bytea-in-Postgres image approach as
-- post_images/listing_images. Apply this against the production database
-- directly (this repo has no automatic migration step in the build).

CREATE TABLE IF NOT EXISTS "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"traveller_id" uuid NOT NULL,
	"data" "bytea" NOT NULL,
	"mime_type" text NOT NULL,
	"caption" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS "story_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"viewer_traveller_id" uuid NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_views_story_id_viewer_traveller_id_unique" UNIQUE("story_id","viewer_traveller_id")
);

DO $$ BEGIN
 ALTER TABLE "stories" ADD CONSTRAINT "stories_traveller_id_traveller_profiles_id_fk" FOREIGN KEY ("traveller_id") REFERENCES "public"."traveller_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "story_views" ADD CONSTRAINT "story_views_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "story_views" ADD CONSTRAINT "story_views_viewer_traveller_id_traveller_profiles_id_fk" FOREIGN KEY ("viewer_traveller_id") REFERENCES "public"."traveller_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "stories_traveller_id_expires_at_idx" ON "stories" USING btree ("traveller_id","expires_at");
CREATE INDEX IF NOT EXISTS "stories_expires_at_idx" ON "stories" USING btree ("expires_at");
