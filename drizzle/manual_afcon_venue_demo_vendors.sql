-- Demo vendors for the AFCON venue pages (/afcon/namboole, /afcon/hoima,
-- /afcon/lira) — one hotel, restaurant, activity, and transport listing near
-- each stadium, with real coordinates so the distance sort has something to
-- show. Idempotent — safe to run more than once; skips any listing whose
-- title already exists. Equivalent to the "Seed AFCON venue vendors" admin
-- button. Demo vendor login password (all 12): WanoLocalDev-9214!

DO $$
DECLARE
  v_password_hash text := '$2b$10$.Q2wBRT2SQLsU7e48NhS0.e88b4TYKvX7MQDz7wZJGXpbY2DqSb2O';
  v_user_id uuid;
  v_vendor_id uuid;
  v_listing_id uuid;
  r RECORD;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      -- Namboole (Mandela National Stadium) — Kira/Wakiso circuit
      ('hotel', 'Namboole Heights Hotel', 'namboole-heights-hotel-demo',
       'demo.namboole.heights.hotel@wano.app', 'Kira',
       'A stadium-adjacent hotel built for match-day crowds.',
       'Namboole Heights Hotel — Matchday Rooms',
       'Ten minutes'' walk from Mandela National Stadium, with a shuttle on match days.',
       260000, '/night', 0.351000::numeric, 32.654000::numeric,
       'Standard, Deluxe, Family', 'Free Wi-Fi, match-day shuttle, generator backup', '2:00 PM', '11:00 AM',
       NULL, NULL, NULL, NULL, NULL, NULL),
      ('restaurant', 'Bweyogerere Grill House', 'bweyogerere-grill-house-demo',
       'demo.bweyogerere.grill.house@wano.app', 'Kira',
       'A Ugandan grill spot a short walk from the stadium gates.',
       'Bweyogerere Grill House',
       'Nyama choma, chips, and cold drinks — fills up fast before kickoff.',
       35000, '/person', 0.346500::numeric, 32.661000::numeric,
       NULL, NULL, NULL, NULL,
       'Ugandan grill', 'Budget', '11am–11pm daily', NULL, NULL, NULL),
      ('experience', 'Kira Heritage Walks', 'kira-heritage-walks-demo',
       'demo.kira.heritage.walks@wano.app', 'Kira',
       'Short guided walks around Kira and Bweyogerere for fans with time before kickoff.',
       'Kira Pre-Match Heritage Walk',
       'A 2-hour guided walk through Kira''s markets and history — a good way to fill the hours before a match.',
       45000, '/person', 0.355000::numeric, 32.648000::numeric,
       NULL, NULL, NULL, NULL,
       NULL, NULL, NULL, '2 hours', '2–12 people', 'Guide, bottled water'),
      ('transport', 'Namboole Express Transfers', 'namboole-express-transfers-demo',
       'demo.namboole.express.transfers@wano.app', 'Kira',
       'Match-day transfers between central Kampala and Mandela National Stadium.',
       'Namboole Express Transfers — Match-Day Shuttle',
       'Fixed-route shuttle between Kampala city centre and the stadium on match days.',
       15000, '/person', 0.349000::numeric, 32.657000::numeric,
       NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
      -- Hoima City Stadium — Albertine circuit
      ('hotel', 'Lake Albert View Lodge', 'lake-albert-view-lodge-demo',
       'demo.lake.albert.view.lodge@wano.app', 'Hoima',
       'A lakeside lodge on the edge of Hoima, looking out over Lake Albert.',
       'Lake Albert View Lodge — Lakeside Rooms',
       'Quiet rooms with lake views, a short drive from Hoima City Stadium.',
       300000, '/night', 1.428000::numeric, 31.352000::numeric,
       'Standard, Lakeside Room', 'Free Wi-Fi, restaurant, generator backup', '2:00 PM', '10:00 AM',
       NULL, NULL, NULL, NULL, NULL, NULL),
      ('restaurant', 'Hoima Cultural Kitchen', 'hoima-cultural-kitchen-demo',
       'demo.hoima.cultural.kitchen@wano.app', 'Hoima',
       'A Bunyoro-cuisine restaurant in central Hoima.',
       'Hoima Cultural Kitchen',
       'Traditional Bunyoro dishes — millet bread, groundnut sauce, and grilled tilapia from Lake Albert.',
       30000, '/person', 1.434000::numeric, 31.358000::numeric,
       NULL, NULL, NULL, NULL,
       'Bunyoro / Ugandan', 'Budget', '8am–10pm daily', NULL, NULL, NULL),
      ('experience', 'Bunyoro Heritage Tours', 'bunyoro-heritage-tours-demo',
       'demo.bunyoro.heritage.tours@wano.app', 'Hoima',
       'Cultural tours around Hoima and the Bunyoro Kingdom, ahead of the longer Murchison Falls trip.',
       'Bunyoro Heritage Trail',
       'A half-day tour of Bunyoro Kingdom cultural sites in and around Hoima City.',
       60000, '/person', 1.440000::numeric, 31.400000::numeric,
       NULL, NULL, NULL, NULL,
       NULL, NULL, NULL, 'Half-day', '2–10 people', 'Guide, kingdom site entry fees'),
      ('transport', 'Albertine Route Transfers', 'albertine-route-transfers-demo',
       'demo.albertine.route.transfers@wano.app', 'Hoima',
       'Match-day and onward transfers around Hoima and toward Murchison Falls.',
       'Albertine Route Transfers — Match-Day Shuttle',
       'Transfers between central Hoima and Hoima City Stadium, with onward Murchison Falls transfers available.',
       20000, '/person', 1.437000::numeric, 31.396000::numeric,
       NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
      -- Akii Bua Stadium — Northern Uganda circuit
      ('hotel', 'Akii Bua Heights Hotel', 'akii-bua-heights-hotel-demo',
       'demo.akii.bua.heights.hotel@wano.app', 'Lira',
       'A modern hotel in Lira City, close to the new Akii Bua Stadium.',
       'Akii Bua Heights Hotel — Matchday Rooms',
       'A short drive from Akii Bua Stadium, with a shuttle laid on for match days.',
       220000, '/night', 2.246000::numeric, 32.897000::numeric,
       'Standard, Deluxe, Family', 'Free Wi-Fi, match-day shuttle, generator backup', '2:00 PM', '11:00 AM',
       NULL, NULL, NULL, NULL, NULL, NULL),
      ('restaurant', 'Lira Lango Kitchen', 'lira-lango-kitchen-demo',
       'demo.lira.lango.kitchen@wano.app', 'Lira',
       'A Lango-cuisine restaurant in central Lira.',
       'Lira Lango Kitchen',
       'Malakwang, millet bread, and grilled fish — Lango home cooking near the stadium.',
       28000, '/person', 2.243000::numeric, 32.903000::numeric,
       NULL, NULL, NULL, NULL,
       'Lango / Ugandan', 'Budget', '8am–10pm daily', NULL, NULL, NULL),
      ('experience', 'Lango Heritage Walks', 'lango-heritage-walks-demo',
       'demo.lango.heritage.walks@wano.app', 'Lira',
       'Guided walks around Lira town and Lango cultural sites for fans with time before kickoff.',
       'Lango Heritage & Craft Walk',
       'A guided walk through Lira town''s markets and Lango cultural sites — a good way to fill the hours before a match.',
       40000, '/person', 2.253000::numeric, 32.893000::numeric,
       NULL, NULL, NULL, NULL,
       NULL, NULL, NULL, '2 hours', '2–12 people', 'Guide, bottled water'),
      ('transport', 'Lira Express Transfers', 'lira-express-transfers-demo',
       'demo.lira.express.transfers@wano.app', 'Lira',
       'Match-day transfers between central Lira and Akii Bua Stadium.',
       'Lira Express Transfers — Match-Day Shuttle',
       'Fixed-route shuttle between Lira town centre and the stadium on match days.',
       12000, '/person', 2.248000::numeric, 32.899000::numeric,
       NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
    ) AS t(
      ltype, business_name, username, email, location, vendor_description, title, description,
      price_minor, price_unit, latitude, longitude,
      room_types, amenities, check_in_time, check_out_time,
      cuisine, price_range, hours,
      duration_text, group_size_text, whats_included
    )
  LOOP
    IF EXISTS (SELECT 1 FROM listings WHERE title = r.title) THEN
      RAISE NOTICE 'Skipped (already exists): %', r.title;
      CONTINUE;
    END IF;

    SELECT id INTO v_user_id FROM users WHERE email = r.email;
    IF v_user_id IS NULL THEN
      INSERT INTO users (email, password_hash, name, role, username)
      VALUES (r.email, v_password_hash, r.business_name, 'vendor', r.username)
      RETURNING id INTO v_user_id;

      INSERT INTO vendor_profiles (user_id, business_name, location, description, accreditation_status)
      VALUES (v_user_id, r.business_name, r.location, r.vendor_description, 'trusted')
      RETURNING id INTO v_vendor_id;
    ELSE
      SELECT id INTO v_vendor_id FROM vendor_profiles WHERE user_id = v_user_id;
    END IF;

    INSERT INTO listings (
      vendor_profile_id, type, title, description, price_label, price_minor,
      currency, price_unit, latitude, longitude, is_published, active
    )
    VALUES (
      v_vendor_id, r.ltype::listing_type, r.title, r.description, 'From', r.price_minor,
      'UGX', r.price_unit, r.latitude, r.longitude, true, true
    )
    RETURNING id INTO v_listing_id;

    INSERT INTO offers (listing_id, discount_text, freebie_text)
    VALUES (v_listing_id, '10% off for Wano members', NULL);

    IF r.ltype = 'hotel' THEN
      INSERT INTO hotel_details (listing_id, room_types, amenities, check_in_time, check_out_time)
      VALUES (v_listing_id, r.room_types, r.amenities, r.check_in_time, r.check_out_time);
    ELSIF r.ltype = 'restaurant' THEN
      INSERT INTO restaurant_details (listing_id, cuisine, price_range, hours)
      VALUES (v_listing_id, r.cuisine, r.price_range, r.hours);
    ELSIF r.ltype = 'experience' THEN
      INSERT INTO experience_details (listing_id, duration_text, group_size_text, whats_included)
      VALUES (v_listing_id, r.duration_text, r.group_size_text, r.whats_included);
    END IF;

    INSERT INTO feed_items (type, dedupe_key, payload, listing_id, city)
    VALUES (
      'place_added',
      'place_added:' || v_listing_id::text,
      jsonb_build_object(
        'kind', 'place_added',
        'title', r.title,
        'subtitle', r.business_name || ' · ' || r.ltype,
        'href', '/explore/' || v_listing_id::text
      ),
      v_listing_id,
      r.location
    )
    ON CONFLICT (dedupe_key) DO NOTHING;

    RAISE NOTICE 'Created: %', r.title;
  END LOOP;
END $$;
