-- Bookmarking a post — same shape as saved_listings, for the Social feed's
-- bookmark icon. Apply this against the production database directly (this
-- repo has no automatic migration step in the build).

CREATE TABLE IF NOT EXISTS "saved_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"traveller_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_posts_traveller_id_post_id_unique" UNIQUE("traveller_id","post_id")
);

DO $$ BEGIN
 ALTER TABLE "saved_posts" ADD CONSTRAINT "saved_posts_traveller_id_traveller_profiles_id_fk" FOREIGN KEY ("traveller_id") REFERENCES "public"."traveller_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "saved_posts" ADD CONSTRAINT "saved_posts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
