-- Row Level Security, Round A: the tables with a direct ownership column.
--
-- listings, slots, posts, and traveller_profiles are all read publicly
-- today (Explore, the slot picker, the social feed, and public profile
-- pages) — SELECT stays open (USING true) on all four. Only writes
-- (INSERT/UPDATE/DELETE) are restricted to the owning vendor/traveller or
-- an admin. vendor_documents and vendor_submissions have no public read
-- path at all (KYC docs, a vendor's pending edit queue), so both reads
-- and writes are restricted there.
--
-- This is defense-in-depth underneath the app-level ownership checks
-- that already exist in every action/data-fetch function — those checks
-- stay exactly as they are; this holds even if one of them is ever
-- accidentally removed.
--
-- Every policy is keyed on transaction-local session variables set by
-- src/lib/db-context.ts's withRlsContext (app.role, app.vendor_profile_id,
-- app.traveller_profile_id, app.user_id) — NULLIF(..., '') turns an unset
-- or empty setting into SQL NULL so the comparison is simply false rather
-- than erroring on an empty-string-to-uuid cast.
--
-- IMPORTANT — read before relying on this: FORCE ROW LEVEL SECURITY has
-- NO EFFECT on a Postgres superuser connection, only on a non-superuser
-- table owner. If the DATABASE_URL role Vercel uses is a superuser, none
-- of this is actually enforced no matter how correct the policies are.
-- Confirm your production role is not a superuser before treating this
-- as real protection.

-- ── listings ────────────────────────────────────────────────────────────
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings FORCE ROW LEVEL SECURITY;

CREATE POLICY listings_select_all ON listings FOR SELECT USING (true);

CREATE POLICY listings_insert_own ON listings FOR INSERT WITH CHECK (
  current_setting('app.role', true) = 'admin'
  OR vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
);

CREATE POLICY listings_update_own ON listings FOR UPDATE USING (
  current_setting('app.role', true) = 'admin'
  OR vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
) WITH CHECK (
  current_setting('app.role', true) = 'admin'
  OR vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
);

CREATE POLICY listings_delete_own ON listings FOR DELETE USING (
  current_setting('app.role', true) = 'admin'
  OR vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
);

-- ── slots ───────────────────────────────────────────────────────────────
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots FORCE ROW LEVEL SECURITY;

CREATE POLICY slots_select_all ON slots FOR SELECT USING (true);

CREATE POLICY slots_insert_own ON slots FOR INSERT WITH CHECK (
  current_setting('app.role', true) = 'admin'
  OR vendor_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
);

CREATE POLICY slots_update_own ON slots FOR UPDATE USING (
  current_setting('app.role', true) = 'admin'
  OR vendor_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
) WITH CHECK (
  current_setting('app.role', true) = 'admin'
  OR vendor_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
);

CREATE POLICY slots_delete_own ON slots FOR DELETE USING (
  current_setting('app.role', true) = 'admin'
  OR vendor_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
);

-- ── posts ───────────────────────────────────────────────────────────────
-- Exactly one of traveller_id/vendor_profile_id is set per row (enforced
-- in app code, same as bookings' listing_id/event_id split).
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts FORCE ROW LEVEL SECURITY;

CREATE POLICY posts_select_all ON posts FOR SELECT USING (true);

CREATE POLICY posts_insert_own ON posts FOR INSERT WITH CHECK (
  current_setting('app.role', true) = 'admin'
  OR traveller_id = NULLIF(current_setting('app.traveller_profile_id', true), '')::uuid
  OR vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
);

CREATE POLICY posts_update_own ON posts FOR UPDATE USING (
  current_setting('app.role', true) = 'admin'
  OR traveller_id = NULLIF(current_setting('app.traveller_profile_id', true), '')::uuid
  OR vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
) WITH CHECK (
  current_setting('app.role', true) = 'admin'
  OR traveller_id = NULLIF(current_setting('app.traveller_profile_id', true), '')::uuid
  OR vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
);

CREATE POLICY posts_delete_own ON posts FOR DELETE USING (
  current_setting('app.role', true) = 'admin'
  OR traveller_id = NULLIF(current_setting('app.traveller_profile_id', true), '')::uuid
  OR vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
);

-- ── traveller_profiles ─────────────────────────────────────────────────
-- Keyed on user_id (always set on every authenticated session) rather
-- than traveller_profile_id, since the latter doesn't exist yet at the
-- exact moment a brand-new profile row is being inserted during signup.
ALTER TABLE traveller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE traveller_profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY traveller_profiles_select_all ON traveller_profiles FOR SELECT USING (true);

CREATE POLICY traveller_profiles_insert_own ON traveller_profiles FOR INSERT WITH CHECK (
  current_setting('app.role', true) = 'admin'
  OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
);

CREATE POLICY traveller_profiles_update_own ON traveller_profiles FOR UPDATE USING (
  current_setting('app.role', true) = 'admin'
  OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
) WITH CHECK (
  current_setting('app.role', true) = 'admin'
  OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
);

CREATE POLICY traveller_profiles_delete_own ON traveller_profiles FOR DELETE USING (
  current_setting('app.role', true) = 'admin'
  OR user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
);

-- ── vendor_documents (fully private — KYC, no public read path) ────────
ALTER TABLE vendor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_documents FORCE ROW LEVEL SECURITY;

CREATE POLICY vendor_documents_all_own ON vendor_documents FOR ALL USING (
  current_setting('app.role', true) = 'admin'
  OR vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
) WITH CHECK (
  current_setting('app.role', true) = 'admin'
  OR vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
);

-- ── vendor_submissions (fully private — a vendor's pending edit queue) ──
ALTER TABLE vendor_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_submissions FORCE ROW LEVEL SECURITY;

CREATE POLICY vendor_submissions_all_own ON vendor_submissions FOR ALL USING (
  current_setting('app.role', true) = 'admin'
  OR vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
) WITH CHECK (
  current_setting('app.role', true) = 'admin'
  OR vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
);
