-- =============================================================================
-- Baby gift registry: schema, security (RLS), reservation logic, realtime.
--
-- Security model in one paragraph:
--   * Guests are anonymous (`anon` role). They may READ catalogue tables
--     (categories, gifts, retailers, gift_retailers, store_locations,
--     registry_settings) and nothing else. They cannot read reservations,
--     reservation_events or reservation_attempts at all.
--   * Reservations are created only through public.reserve_gift(), a
--     SECURITY DEFINER function that is executable by `service_role` only.
--     The Next.js server calls it (server-side, never from the browser) after
--     its own validation/honeypot checks, passing a salted hash of the
--     guest's IP so the database can throttle repeated attempts.
--   * Administrators are Supabase Auth users that have a row in
--     public.admin_profiles. Every admin read/write is checked by RLS via
--     public.is_admin(); admin state changes go through admin_* functions
--     that re-check is_admin() and lock rows.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- Types
-- -----------------------------------------------------------------------------
create type public.gift_status as enum ('available', 'reserved', 'purchased');
create type public.price_basis as enum ('shelf_tag', 'online', 'estimate');
create type public.gift_tier as enum ('budget', 'standard', 'premium');
create type public.reservation_status as enum ('active', 'purchased', 'cancelled', 'released', 'expired');
create type public.image_kind as enum ('store_photo', 'inspiration', 'uploaded', 'placeholder');

-- -----------------------------------------------------------------------------
-- Admins
-- -----------------------------------------------------------------------------
create table public.admin_profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Registry owner',
  created_at   timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_profiles a where a.user_id = (select auth.uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- Catalogue
-- -----------------------------------------------------------------------------
create table public.categories (
  id                  smallint generated always as identity primary key,
  slug                text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name                text not null check (char_length(name) between 1 and 80),
  description         text check (char_length(description) <= 600),
  sort_order          smallint not null default 0,
  -- Figures exactly as printed in the original Baby_List.pdf budget table.
  doc_budget_aed      numeric(10, 2),
  doc_full_aed        numeric(10, 2),
  created_at          timestamptz not null default now()
);

create table public.retailers (
  id           smallint generated always as identity primary key,
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name         text not null check (char_length(name) between 1 and 120),
  -- Only fill these with verified values. Left null by the PDF import.
  website_url  text check (website_url is null or website_url ~* '^https://'),
  phone        text check (char_length(phone) <= 40),
  notes        text check (char_length(notes) <= 1000),
  created_at   timestamptz not null default now()
);

create table public.store_locations (
  id           uuid primary key default gen_random_uuid(),
  retailer_id  smallint not null references public.retailers (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 160),
  area         text check (char_length(area) <= 160),          -- e.g. "Dubai Mall"
  address      text check (char_length(address) <= 400),
  phone        text check (char_length(phone) <= 40),
  maps_url     text check (maps_url is null or maps_url ~* '^https://'),
  verified     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index store_locations_retailer_idx on public.store_locations (retailer_id);

create table public.gifts (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category_id       smallint not null references public.categories (id) on delete restrict,
  name              text not null check (char_length(name) between 1 and 160),
  description       text check (char_length(description) <= 2000),
  notes             text check (char_length(notes) <= 2000),

  -- Prices (AED is the reference currency).
  price_aed         numeric(10, 2) check (price_aed is null or price_aed >= 0),
  sale_price_aed    numeric(10, 2) check (sale_price_aed is null or sale_price_aed >= 0),
  price_min_aed     numeric(10, 2) check (price_min_aed is null or price_min_aed >= 0),
  price_max_aed     numeric(10, 2) check (price_max_aed is null or price_max_aed >= 0),
  price_unit        text check (char_length(price_unit) <= 60),   -- "each", "per 2-pack"…
  price_basis       public.price_basis not null default 'estimate',
  price_label       text check (char_length(price_label) <= 200), -- verbatim from the PDF
  -- One number used for sorting, filters and totals: sale price, else listed
  -- price, else the middle of the range (the PDF's own rule for estimates).
  reference_price_aed numeric(10, 2) generated always as (
    coalesce(sale_price_aed, price_aed, round((price_min_aed + price_max_aed) / 2, 2), price_min_aed, price_max_aed)
  ) stored,

  -- How the item relates to the original document's two budget scenarios.
  tier              public.gift_tier not null default 'standard',
  in_doc_budget     boolean not null default false,
  in_doc_full       boolean not null default false,
  is_alternative    boolean not null default false,
  is_featured       boolean not null default false,

  -- Imagery.
  image_url         text check (char_length(image_url) <= 1000),
  image_kind        public.image_kind not null default 'placeholder',
  image_caption     text check (char_length(image_caption) <= 300),
  photo_refs        text check (char_length(photo_refs) <= 120),   -- PDF photo numbers

  status            public.gift_status not null default 'available',
  status_changed_at timestamptz not null default now(),
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint gifts_price_range_ordered check (
    price_min_aed is null or price_max_aed is null or price_min_aed <= price_max_aed
  )
);
create index gifts_category_idx on public.gifts (category_id, sort_order);
create index gifts_status_idx on public.gifts (status);

create table public.gift_retailers (
  id            uuid primary key default gen_random_uuid(),
  gift_id       uuid not null references public.gifts (id) on delete cascade,
  retailer_id   smallint not null references public.retailers (id) on delete cascade,
  -- Direct product page. Only verified URLs; otherwise leave null and the UI
  -- generates clearly labelled search links instead.
  product_url   text check (product_url is null or product_url ~* '^https://'),
  url_verified  boolean not null default false,
  source_note   text check (char_length(source_note) <= 300),  -- e.g. "Photographed in store"
  is_primary    boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (gift_id, retailer_id)
);
create index gift_retailers_retailer_idx on public.gift_retailers (retailer_id);

-- -----------------------------------------------------------------------------
-- Settings (single row)
-- -----------------------------------------------------------------------------
create table public.registry_settings (
  id                          smallint primary key default 1 check (id = 1),
  registry_title              text not null default 'Our Baby Registry' check (char_length(registry_title) <= 120),
  welcome_heading             text not null default 'Made with love for our little one.' check (char_length(welcome_heading) <= 200),
  welcome_text                text not null default '' check (char_length(welcome_text) <= 2000),
  prices_recorded_on          date,
  price_notice                text not null default '' check (char_length(price_notice) <= 600),
  -- Currency. Null rate = UGX conversion not configured; UI shows AED only.
  aed_to_ugx_rate             numeric(14, 4) check (aed_to_ugx_rate is null or aed_to_ugx_rate > 0),
  rate_updated_at             timestamptz,
  rate_source                 text check (char_length(rate_source) <= 200),
  -- Original document estimates (not live totals).
  doc_budget_total_aed        numeric(10, 2),
  doc_full_total_aed          numeric(10, 2),
  doc_totals_note             text check (char_length(doc_totals_note) <= 2000),
  -- Optional reservation expiry. Disabled by default; never auto-releases
  -- unless an administrator turns this on.
  reservation_expiry_enabled  boolean not null default false,
  reservation_expiry_hours    integer check (reservation_expiry_hours is null or reservation_expiry_hours between 1 and 8760),
  -- Anti-spam limits used by reserve_gift().
  max_reservations_per_client_per_day integer not null default 5 check (max_reservations_per_client_per_day between 1 and 100),
  max_attempts_per_client_per_10min   integer not null default 15 check (max_attempts_per_client_per_10min between 1 and 500),
  updated_at                  timestamptz not null default now()
);

create table public.exchange_rate_history (
  id          bigint generated always as identity primary key,
  rate        numeric(14, 4) not null,
  source      text,
  changed_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Reservations
-- -----------------------------------------------------------------------------
create table public.reservations (
  id                 uuid primary key default gen_random_uuid(),
  reference          text not null unique,
  gift_id            uuid references public.gifts (id) on delete set null,
  gift_name_snapshot text not null,
  price_aed_snapshot numeric(10, 2),
  guest_name         text not null check (char_length(guest_name) between 1 and 100),
  guest_email        text check (guest_email is null or (char_length(guest_email) <= 254 and guest_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  guest_phone        text check (guest_phone is null or (char_length(guest_phone) <= 32 and guest_phone ~ '^[0-9+()\-\s.]{5,32}$')),
  message            text check (char_length(message) <= 1000),
  status             public.reservation_status not null default 'active',
  client_hash        text,
  admin_note         text check (char_length(admin_note) <= 1000),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  purchased_at       timestamptz,
  closed_at          timestamptz
);
-- Database-level guarantee: at most one live reservation per gift, ever.
create unique index reservations_one_live_per_gift
  on public.reservations (gift_id) where status in ('active', 'purchased');
create index reservations_created_idx on public.reservations (created_at desc);
create index reservations_client_idx on public.reservations (client_hash, created_at);

create table public.reservation_events (
  id              bigint generated always as identity primary key,
  reservation_id  uuid references public.reservations (id) on delete cascade,
  gift_id         uuid references public.gifts (id) on delete set null,
  event           text not null,      -- reserved, purchased, cancelled, released, expired, status_set
  actor           text not null,      -- 'guest', 'admin', 'system'
  actor_user_id   uuid references auth.users (id) on delete set null,
  details         text,
  created_at      timestamptz not null default now()
);
create index reservation_events_created_idx on public.reservation_events (created_at desc);
create index reservation_events_reservation_idx on public.reservation_events (reservation_id);

create table public.reservation_attempts (
  id           bigint generated always as identity primary key,
  client_hash  text not null,
  gift_id      uuid,
  outcome      text not null,
  created_at   timestamptz not null default now()
);
create index reservation_attempts_client_idx on public.reservation_attempts (client_hash, created_at);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger gifts_touch before update on public.gifts
  for each row execute function public.touch_updated_at();
create trigger reservations_touch before update on public.reservations
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.registry_settings
  for each row execute function public.touch_updated_at();

create or replace function public.gifts_status_changed()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
  end if;
  return new;
end;
$$;
create trigger gifts_status_changed before update on public.gifts
  for each row execute function public.gifts_status_changed();

-- Record every exchange-rate change and stamp the update time.
create or replace function public.settings_rate_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.aed_to_ugx_rate is distinct from old.aed_to_ugx_rate then
    new.rate_updated_at := now();
    if new.aed_to_ugx_rate is not null then
      insert into public.exchange_rate_history (rate, source, changed_by)
      values (new.aed_to_ugx_rate, new.rate_source, (select auth.uid()));
    end if;
  end if;
  return new;
end;
$$;
create trigger settings_rate_changed before update on public.registry_settings
  for each row execute function public.settings_rate_changed();

-- -----------------------------------------------------------------------------
-- Reservation logic
-- -----------------------------------------------------------------------------

-- Unambiguous alphabet (no 0/O, 1/I/L). 10 random chars ≈ 49 bits.
create or replace function public.generate_reservation_reference()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(10);
  out_ text := '';
  i int;
begin
  for i in 0..9 loop
    out_ := out_ || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
    if i = 4 then out_ := out_ || '-'; end if;
  end loop;
  return 'GIFT-' || out_;
end;
$$;

-- Trim, collapse whitespace, strip control characters and angle brackets.
create or replace function public.clean_text(p text, max_len int)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(
    left(
      btrim(regexp_replace(regexp_replace(coalesce(p, ''), '[[:cntrl:]<>]', ' ', 'g'), '[ \t]+', ' ', 'g')),
      max_len
    ),
    ''
  );
$$;

/*
 * reserve_gift — the ONLY way a reservation is created.
 *
 * Atomicity: the gift row is locked with SELECT … FOR UPDATE. A concurrent
 * call for the same gift blocks on that lock until the first transaction
 * commits, then re-reads the row, sees status = 'reserved' and returns
 * 'unavailable'. The partial unique index reservations_one_live_per_gift is
 * a second, independent guarantee.
 *
 * Returns jsonb: { ok: true, reference, gift_id, gift_name, price_aed }
 *            or  { ok: false, error: 'unavailable' | 'not_found' | 'invalid' | 'rate_limited', message }
 */
create or replace function public.reserve_gift(
  p_gift_id     uuid,
  p_guest_name  text,
  p_guest_email text default null,
  p_guest_phone text default null,
  p_message     text default null,
  p_client_hash text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_gift      public.gifts%rowtype;
  v_settings  public.registry_settings%rowtype;
  v_name      text := public.clean_text(p_guest_name, 100);
  v_email     text := lower(public.clean_text(p_guest_email, 254));
  v_phone     text := public.clean_text(p_guest_phone, 32);
  v_message   text := public.clean_text(p_message, 1000);
  v_client    text := coalesce(public.clean_text(p_client_hash, 128), 'unknown');
  v_ref       text;
  v_res_id    uuid;
  v_attempts  int;
  v_recent    int;
begin
  select * into v_settings from public.registry_settings where id = 1;

  -- Throttle repeated attempts from the same client.
  select count(*) into v_attempts
    from public.reservation_attempts
   where client_hash = v_client and created_at > now() - interval '10 minutes';
  if v_attempts >= coalesce(v_settings.max_attempts_per_client_per_10min, 15) then
    insert into public.reservation_attempts (client_hash, gift_id, outcome) values (v_client, p_gift_id, 'rate_limited');
    return jsonb_build_object('ok', false, 'error', 'rate_limited',
      'message', 'Too many attempts. Please wait a few minutes and try again.');
  end if;

  select count(*) into v_recent
    from public.reservations
   where client_hash = v_client and created_at > now() - interval '24 hours'
     and status in ('active', 'purchased');
  if v_recent >= coalesce(v_settings.max_reservations_per_client_per_day, 5) then
    insert into public.reservation_attempts (client_hash, gift_id, outcome) values (v_client, p_gift_id, 'rate_limited');
    return jsonb_build_object('ok', false, 'error', 'rate_limited',
      'message', 'You have reserved several gifts already today. Please contact the family if you would like to reserve more.');
  end if;

  -- Validate input.
  if v_name is null or char_length(v_name) < 2 then
    insert into public.reservation_attempts (client_hash, gift_id, outcome) values (v_client, p_gift_id, 'invalid');
    return jsonb_build_object('ok', false, 'error', 'invalid', 'message', 'Please enter your name.');
  end if;
  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    insert into public.reservation_attempts (client_hash, gift_id, outcome) values (v_client, p_gift_id, 'invalid');
    return jsonb_build_object('ok', false, 'error', 'invalid', 'message', 'Please enter a valid email address or leave it blank.');
  end if;
  if v_phone is not null and v_phone !~ '^[0-9+()\-\s.]{5,32}$' then
    insert into public.reservation_attempts (client_hash, gift_id, outcome) values (v_client, p_gift_id, 'invalid');
    return jsonb_build_object('ok', false, 'error', 'invalid', 'message', 'Please enter a valid phone number or leave it blank.');
  end if;

  -- Lock the gift row. Concurrent reservers queue here.
  select * into v_gift from public.gifts where id = p_gift_id for update;
  if not found then
    insert into public.reservation_attempts (client_hash, gift_id, outcome) values (v_client, p_gift_id, 'not_found');
    return jsonb_build_object('ok', false, 'error', 'not_found', 'message', 'We could not find that gift.');
  end if;

  if v_gift.status <> 'available' then
    insert into public.reservation_attempts (client_hash, gift_id, outcome) values (v_client, p_gift_id, 'unavailable');
    return jsonb_build_object('ok', false, 'error', 'unavailable', 'status', v_gift.status,
      'message', 'Sorry — someone has just reserved this gift, so it is no longer available. Please choose another one from the list.');
  end if;

  -- Generate a unique reference (retry on the astronomically unlikely clash).
  loop
    v_ref := public.generate_reservation_reference();
    exit when not exists (select 1 from public.reservations where reference = v_ref);
  end loop;

  insert into public.reservations (reference, gift_id, gift_name_snapshot, price_aed_snapshot,
                                   guest_name, guest_email, guest_phone, message, client_hash)
  values (v_ref, v_gift.id, v_gift.name, v_gift.reference_price_aed,
          v_name, v_email, v_phone, v_message, v_client)
  returning id into v_res_id;

  perform set_config('registry.allow_status_change', 'on', true);
  update public.gifts set status = 'reserved' where id = v_gift.id;
  perform set_config('registry.allow_status_change', '', true);

  insert into public.reservation_events (reservation_id, gift_id, event, actor, details)
  values (v_res_id, v_gift.id, 'reserved', 'guest', 'Reserved by ' || v_name);
  insert into public.reservation_attempts (client_hash, gift_id, outcome) values (v_client, p_gift_id, 'reserved');

  return jsonb_build_object('ok', true, 'reference', v_ref, 'gift_id', v_gift.id,
                            'gift_slug', v_gift.slug, 'gift_name', v_gift.name,
                            'price_aed', v_gift.reference_price_aed);
exception
  when unique_violation then
    -- Only reachable if the partial unique index caught a race the lock missed.
    return jsonb_build_object('ok', false, 'error', 'unavailable',
      'message', 'Sorry — someone has just reserved this gift, so it is no longer available. Please choose another one from the list.');
end;
$$;

/*
 * Public confirmation lookup. Knowing the (unguessable) reference is the
 * credential. Returns only what the guest needs: no email, phone or message,
 * and only the guest's first name.
 */
create or replace function public.get_reservation_public(p_reference text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
           'reference', r.reference,
           'status', r.status,
           'created_at', r.created_at,
           'guest_first_name', split_part(r.guest_name, ' ', 1),
           'gift_id', g.id,
           'gift_slug', g.slug,
           'gift_name', coalesce(g.name, r.gift_name_snapshot),
           'price_aed', r.price_aed_snapshot
         )
    from public.reservations r
    left join public.gifts g on g.id = r.gift_id
   where r.reference = upper(btrim(p_reference))
     and char_length(p_reference) between 8 and 40;
$$;

-- --------------------------- admin operations --------------------------------

create or replace function public.assert_admin()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
end;
$$;

-- Mark a reservation's gift as purchased.
create or replace function public.admin_mark_reservation_purchased(p_reservation_id uuid, p_note text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare r public.reservations%rowtype;
begin
  perform public.assert_admin();
  select * into r from public.reservations where id = p_reservation_id for update;
  if not found then raise exception 'Reservation not found'; end if;
  if r.status <> 'active' then raise exception 'Only active reservations can be marked purchased (status is %)', r.status; end if;
  perform 1 from public.gifts where id = r.gift_id for update;
  update public.reservations
     set status = 'purchased', purchased_at = now(),
         admin_note = coalesce(public.clean_text(p_note, 1000), admin_note)
   where id = r.id;
  perform set_config('registry.allow_status_change', 'on', true);
  update public.gifts set status = 'purchased' where id = r.gift_id;
  perform set_config('registry.allow_status_change', '', true);
  insert into public.reservation_events (reservation_id, gift_id, event, actor, actor_user_id, details)
  values (r.id, r.gift_id, 'purchased', 'admin', (select auth.uid()), public.clean_text(p_note, 1000));
end;
$$;

-- Cancel (or release) a reservation and make the gift available again.
create or replace function public.admin_close_reservation(
  p_reservation_id uuid,
  p_new_status public.reservation_status default 'cancelled',
  p_note text default null
)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare r public.reservations%rowtype;
begin
  perform public.assert_admin();
  if p_new_status not in ('cancelled', 'released') then
    raise exception 'Invalid status %', p_new_status;
  end if;
  select * into r from public.reservations where id = p_reservation_id for update;
  if not found then raise exception 'Reservation not found'; end if;
  if r.status not in ('active', 'purchased') then
    raise exception 'Reservation is already closed (status is %)', r.status;
  end if;
  perform 1 from public.gifts where id = r.gift_id for update;
  update public.reservations
     set status = p_new_status, closed_at = now(),
         admin_note = coalesce(public.clean_text(p_note, 1000), admin_note)
   where id = r.id;
  perform set_config('registry.allow_status_change', 'on', true);
  update public.gifts set status = 'available' where id = r.gift_id;
  perform set_config('registry.allow_status_change', '', true);
  insert into public.reservation_events (reservation_id, gift_id, event, actor, actor_user_id, details)
  values (r.id, r.gift_id, p_new_status::text, 'admin', (select auth.uid()), public.clean_text(p_note, 1000));
end;
$$;

-- Set a gift's status directly (e.g. owner bought it themselves, or release).
-- Keeps reservations consistent with the gift status.
create or replace function public.admin_set_gift_status(p_gift_id uuid, p_status public.gift_status, p_note text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  g public.gifts%rowtype;
  r public.reservations%rowtype;
begin
  perform public.assert_admin();
  select * into g from public.gifts where id = p_gift_id for update;
  if not found then raise exception 'Gift not found'; end if;
  select * into r from public.reservations
   where gift_id = p_gift_id and status in ('active', 'purchased') for update;

  if p_status = 'available' then
    if r.id is not null then
      update public.reservations set status = 'released', closed_at = now() where id = r.id;
    end if;
  elsif p_status = 'purchased' then
    if r.id is not null and r.status = 'active' then
      update public.reservations set status = 'purchased', purchased_at = now() where id = r.id;
    end if;
  elsif p_status = 'reserved' then
    if r.id is null then
      raise exception 'Use the public reservation form to reserve a gift, so a guest and reference are recorded';
    elsif r.status = 'purchased' then
      update public.reservations set status = 'active', purchased_at = null where id = r.id;
    end if;
  end if;

  perform set_config('registry.allow_status_change', 'on', true);
  update public.gifts set status = p_status where id = p_gift_id;
  perform set_config('registry.allow_status_change', '', true);
  insert into public.reservation_events (reservation_id, gift_id, event, actor, actor_user_id, details)
  values (r.id, p_gift_id, 'status_set:' || p_status::text, 'admin', (select auth.uid()), public.clean_text(p_note, 1000));
end;
$$;

-- Optional expiry. No-op unless an administrator enabled it in settings.
create or replace function public.release_expired_reservations()
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare
  s public.registry_settings%rowtype;
  r record;
  n int := 0;
begin
  select * into s from public.registry_settings where id = 1;
  if not coalesce(s.reservation_expiry_enabled, false) or s.reservation_expiry_hours is null then
    return 0;
  end if;
  for r in
    select id, gift_id from public.reservations
     where status = 'active'
       and created_at < now() - make_interval(hours => s.reservation_expiry_hours)
     for update skip locked
  loop
    update public.reservations set status = 'expired', closed_at = now() where id = r.id;
    perform set_config('registry.allow_status_change', 'on', true);
    update public.gifts set status = 'available' where id = r.gift_id and status = 'reserved';
    perform set_config('registry.allow_status_change', '', true);
    insert into public.reservation_events (reservation_id, gift_id, event, actor, details)
    values (r.id, r.gift_id, 'expired', 'system', 'Released automatically after ' || s.reservation_expiry_hours || ' hours');
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- -----------------------------------------------------------------------------
-- Guard: gift status may only change via the functions above (or admins).
-- Prevents an admin "edit product" form from silently desyncing reservations.
-- -----------------------------------------------------------------------------
create or replace function public.guard_gift_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('registry.allow_status_change', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' and new.status <> 'available' then
    raise exception 'New gifts start as available' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    raise exception 'Gift status can only change through reservation functions' using errcode = '42501';
  end if;
  return new;
end;
$$;
create or replace function public.guard_gift_delete()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('registry.allow_status_change', true), '') = 'on' then
    return old;
  end if;
  if old.status <> 'available' then
    raise exception 'Release this gift before deleting it (it is currently %)', old.status using errcode = '42501';
  end if;
  return old;
end;
$$;
create trigger gifts_guard_delete before delete on public.gifts
  for each row execute function public.guard_gift_delete();

create trigger gifts_guard_status before insert or update on public.gifts
  for each row execute function public.guard_gift_status();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.admin_profiles        enable row level security;
alter table public.categories            enable row level security;
alter table public.retailers             enable row level security;
alter table public.store_locations       enable row level security;
alter table public.gifts                 enable row level security;
alter table public.gift_retailers        enable row level security;
alter table public.registry_settings     enable row level security;
alter table public.exchange_rate_history enable row level security;
alter table public.reservations          enable row level security;
alter table public.reservation_events    enable row level security;
alter table public.reservation_attempts  enable row level security;

-- Public catalogue: readable by everyone; writable by admins only.
create policy "catalogue read" on public.categories for select to anon, authenticated using (true);
create policy "catalogue admin write" on public.categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "retailers read" on public.retailers for select to anon, authenticated using (true);
create policy "retailers admin write" on public.retailers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "locations read" on public.store_locations for select to anon, authenticated using (true);
create policy "locations admin write" on public.store_locations for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "gifts read" on public.gifts for select to anon, authenticated using (true);
create policy "gifts admin write" on public.gifts for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "gift retailers read" on public.gift_retailers for select to anon, authenticated using (true);
create policy "gift retailers admin write" on public.gift_retailers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "settings read" on public.registry_settings for select to anon, authenticated using (true);
create policy "settings admin update" on public.registry_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Private: admins only. No policy for anon at all → no rows, ever.
create policy "rate history admin read" on public.exchange_rate_history for select to authenticated
  using ((select public.is_admin()));
create policy "reservations admin read" on public.reservations for select to authenticated
  using ((select public.is_admin()));
create policy "reservations admin update" on public.reservations for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "events admin read" on public.reservation_events for select to authenticated
  using ((select public.is_admin()));
create policy "admin profiles self read" on public.admin_profiles for select to authenticated
  using (user_id = (select auth.uid()));
-- reservation_attempts: no policies → only SECURITY DEFINER functions touch it.

-- Table privileges (defence in depth on top of RLS).
revoke all on public.reservations, public.reservation_events, public.reservation_attempts,
              public.exchange_rate_history, public.admin_profiles from anon;
revoke insert, delete on public.reservations from authenticated;
revoke insert, update, delete on public.reservation_events from authenticated;
revoke all on public.reservation_attempts from authenticated;
revoke insert, update, delete on public.admin_profiles from authenticated;
revoke insert, update, delete, truncate on public.categories, public.retailers, public.store_locations,
              public.gifts, public.gift_retailers, public.registry_settings from anon;
revoke truncate on all tables in schema public from authenticated;

-- Function privileges.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.get_reservation_public(text) to anon, authenticated;
grant execute on function public.admin_mark_reservation_purchased(uuid, text) to authenticated;
grant execute on function public.admin_close_reservation(uuid, public.reservation_status, text) to authenticated;
grant execute on function public.admin_set_gift_status(uuid, public.gift_status, text) to authenticated;
-- Reservation creation and expiry: server-side only (service role).
grant execute on function public.reserve_gift(uuid, text, text, text, text, text) to service_role;
grant execute on function public.release_expired_reservations() to service_role;
-- Functions created later in this schema must be granted explicitly.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Realtime: broadcast gift status changes (public data only) and, for the
-- admin dashboard, reservation changes (RLS limits these to admins).
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.gifts;
alter publication supabase_realtime add table public.registry_settings;
alter publication supabase_realtime add table public.reservations;

-- -----------------------------------------------------------------------------
-- Storage bucket for admin-uploaded product images.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gift-images', 'gift-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "gift images public read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'gift-images');
create policy "gift images admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'gift-images' and (select public.is_admin()));
create policy "gift images admin update" on storage.objects for update to authenticated
  using (bucket_id = 'gift-images' and (select public.is_admin()));
create policy "gift images admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'gift-images' and (select public.is_admin()));
