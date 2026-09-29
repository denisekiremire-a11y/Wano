-- Row Level Security, Round B: tables where ownership is indirect — reached
-- via a join rather than a plain column on the row itself.
--
-- bookings: traveller_id is a direct column (the traveller who made it).
-- Vendor access is via bookings.listing_id -> listings.vendor_profile_id
-- OR bookings.event_id -> events.organizer_vendor_profile_id — a booking's
-- vendor is whichever of those is set (the schema guarantees exactly one).
-- SELECT is also open, unconditionally, for any event booking (event_id
-- IS NOT NULL) — this matches getEventBookingCounts/getEventBookers in
-- src/lib/data/events.ts, which already show "N going" and attendee names
-- to any visitor, logged in or not, with zero app-level gate today. There
-- is no equivalent public path for listing bookings (restaurant
-- reservations etc.), so those stay traveller/vendor/admin-only.
--
-- booking_items and booking_messages have no ownership column of their
-- own at all — access is entirely "can this session access the parent
-- booking". wano_booking_owned(uuid) below is the shared, narrow check
-- (traveller-own OR vendor-of-listing-or-event OR admin — deliberately
-- NOT including the public event_id branch: booking_items/booking_messages
-- have no public-read counterpart anywhere in the app).
--
-- stamps has traveller_id directly, but a traveller never earns their own
-- stamp with a direct write — it's always minted by the vendor's
-- accept-request action or an admin's status change, both already-checked
-- trusted-system writes (same reasoning as Round A's slot bookkeeping), so
-- writes are admin-context-only; reads are traveller-own-or-admin.
--
-- rewards is an admin-managed catalog with no traveller/vendor owner
-- column — writes are admin-only; reads are open to any authenticated
-- role (traveller/vendor/admin — i.e. app.role is set to something),
-- matching every real read path (never queried by an anonymous visitor).
--
-- user_rewards is traveller-owned (the claimed voucher), but redemption is
-- a vendor updating a voucher they don't own — the "wrong venue" check in
-- markRewardRedeemedAction (the voucher's targetType/targetId resolves to
-- a listing/event whose vendor must match the redeeming vendor) is
-- mirrored directly as this table's vendor SELECT/UPDATE policy.
--
-- Same session-variable mechanism as Round A (see manual_rls_round_a.sql
-- and src/lib/db-context.ts) — app.role / app.vendor_profile_id /
-- app.traveller_profile_id, set transaction-local by withRlsContext.
--
-- IMPORTANT — same caveat as Round A: FORCE ROW LEVEL SECURITY has NO
-- EFFECT on a Postgres superuser connection, only on a non-superuser table
-- owner. Confirm your production DATABASE_URL role is not a superuser
-- before treating this as real protection.

CREATE FUNCTION wano_booking_owned(p_booking_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = p_booking_id
    AND (
      current_setting('app.role', true) = 'admin'
      OR b.traveller_id = NULLIF(current_setting('app.traveller_profile_id', true), '')::uuid
      OR EXISTS (
        SELECT 1 FROM listings l
        WHERE l.id = b.listing_id
        AND l.vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
      )
      OR EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = b.event_id
        AND e.organizer_vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
      )
    )
  );
$$;

-- ── bookings ────────────────────────────────────────────────────────────
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings FORCE ROW LEVEL SECURITY;

CREATE POLICY bookings_select_own_traveller ON bookings FOR SELECT USING (
  traveller_id = NULLIF(current_setting('app.traveller_profile_id', true), '')::uuid
);

CREATE POLICY bookings_select_own_vendor ON bookings FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM listings l
    WHERE l.id = bookings.listing_id
    AND l.vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
  )
  OR EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = bookings.event_id
    AND e.organizer_vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
  )
);

CREATE POLICY bookings_select_admin ON bookings FOR SELECT USING (
  current_setting('app.role', true) = 'admin'
);

CREATE POLICY bookings_select_public_events ON bookings FOR SELECT USING (
  event_id IS NOT NULL
);

CREATE POLICY bookings_insert_own_traveller_or_admin ON bookings FOR INSERT WITH CHECK (
  current_setting('app.role', true) = 'admin'
  OR traveller_id = NULLIF(current_setting('app.traveller_profile_id', true), '')::uuid
);

CREATE POLICY bookings_update_own ON bookings FOR UPDATE USING (
  current_setting('app.role', true) = 'admin'
  OR traveller_id = NULLIF(current_setting('app.traveller_profile_id', true), '')::uuid
  OR EXISTS (
    SELECT 1 FROM listings l
    WHERE l.id = bookings.listing_id
    AND l.vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
  )
  OR EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = bookings.event_id
    AND e.organizer_vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
  )
) WITH CHECK (
  current_setting('app.role', true) = 'admin'
  OR traveller_id = NULLIF(current_setting('app.traveller_profile_id', true), '')::uuid
  OR EXISTS (
    SELECT 1 FROM listings l
    WHERE l.id = bookings.listing_id
    AND l.vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
  )
  OR EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = bookings.event_id
    AND e.organizer_vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
  )
);

-- ── booking_items (no owner column — mirrors its parent booking) ───────
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items FORCE ROW LEVEL SECURITY;

CREATE POLICY booking_items_all_via_booking ON booking_items FOR ALL USING (
  wano_booking_owned(booking_id)
) WITH CHECK (
  wano_booking_owned(booking_id)
);

-- ── booking_messages (no owner column — mirrors its parent booking) ────
ALTER TABLE booking_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_messages FORCE ROW LEVEL SECURITY;

CREATE POLICY booking_messages_all_via_booking ON booking_messages FOR ALL USING (
  wano_booking_owned(booking_id)
) WITH CHECK (
  wano_booking_owned(booking_id)
);

-- ── stamps (system-minted only — no direct traveller write path) ───────
ALTER TABLE stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamps FORCE ROW LEVEL SECURITY;

CREATE POLICY stamps_select_own_or_admin ON stamps FOR SELECT USING (
  current_setting('app.role', true) = 'admin'
  OR traveller_id = NULLIF(current_setting('app.traveller_profile_id', true), '')::uuid
);

CREATE POLICY stamps_insert_admin ON stamps FOR INSERT WITH CHECK (
  current_setting('app.role', true) = 'admin'
);

-- ── rewards (admin-managed catalog, no owner column) ────────────────────
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards FORCE ROW LEVEL SECURITY;

CREATE POLICY rewards_select_any_authenticated ON rewards FOR SELECT USING (
  NULLIF(current_setting('app.role', true), '') IS NOT NULL
);

CREATE POLICY rewards_insert_admin ON rewards FOR INSERT WITH CHECK (
  current_setting('app.role', true) = 'admin'
);

CREATE POLICY rewards_update_admin ON rewards FOR UPDATE USING (
  current_setting('app.role', true) = 'admin'
) WITH CHECK (
  current_setting('app.role', true) = 'admin'
);

-- ── user_rewards (traveller-owned; a vendor may also SELECT/UPDATE a
-- voucher they don't own when it targets their own listing/event — this
-- is exactly the "wrong venue" check markRewardRedeemedAction already
-- does in app code, mirrored here) ──────────────────────────────────────
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rewards FORCE ROW LEVEL SECURITY;

CREATE POLICY user_rewards_select_own_or_venue ON user_rewards FOR SELECT USING (
  current_setting('app.role', true) = 'admin'
  OR traveller_id = NULLIF(current_setting('app.traveller_profile_id', true), '')::uuid
  OR redeemed_by_vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
  OR (
    current_setting('app.role', true) = 'vendor'
    AND (
      (target_type = 'listing' AND EXISTS (
        SELECT 1 FROM listings l
        WHERE l.id = user_rewards.target_id
        AND l.vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
      ))
      OR (target_type = 'event' AND EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = user_rewards.target_id
        AND e.organizer_vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
      ))
    )
  )
);

CREATE POLICY user_rewards_insert_own_or_admin ON user_rewards FOR INSERT WITH CHECK (
  current_setting('app.role', true) = 'admin'
  OR traveller_id = NULLIF(current_setting('app.traveller_profile_id', true), '')::uuid
);

CREATE POLICY user_rewards_update_own_or_venue ON user_rewards FOR UPDATE USING (
  current_setting('app.role', true) = 'admin'
  OR traveller_id = NULLIF(current_setting('app.traveller_profile_id', true), '')::uuid
  OR (
    current_setting('app.role', true) = 'vendor'
    AND (
      (target_type = 'listing' AND EXISTS (
        SELECT 1 FROM listings l
        WHERE l.id = user_rewards.target_id
        AND l.vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
      ))
      OR (target_type = 'event' AND EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = user_rewards.target_id
        AND e.organizer_vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
      ))
    )
  )
) WITH CHECK (
  current_setting('app.role', true) = 'admin'
  OR traveller_id = NULLIF(current_setting('app.traveller_profile_id', true), '')::uuid
  OR (
    current_setting('app.role', true) = 'vendor'
    AND (
      (target_type = 'listing' AND EXISTS (
        SELECT 1 FROM listings l
        WHERE l.id = user_rewards.target_id
        AND l.vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
      ))
      OR (target_type = 'event' AND EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = user_rewards.target_id
        AND e.organizer_vendor_profile_id = NULLIF(current_setting('app.vendor_profile_id', true), '')::uuid
      ))
    )
  )
);
