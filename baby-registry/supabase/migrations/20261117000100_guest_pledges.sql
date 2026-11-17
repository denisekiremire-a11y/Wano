-- =============================================================================
-- "My gifts": let a guest see every gift they have pledged, without an account.
--
-- Each browser gets a random guest key (kept in a cookie and in a private link the
-- guest can bookmark or open on another device). Only a SHA-256 hash of the key is
-- stored. get_guest_pledges() returns that guest's reservations — gift, status,
-- reference — and never any contact details.
-- =============================================================================

alter table public.reservations add column if not exists guest_key_hash text;
create index if not exists reservations_guest_key_idx on public.reservations (guest_key_hash, created_at desc);

create or replace function public.hash_guest_key(p_key text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_key ~ '^[A-Za-z0-9_-]{32,128}$' then encode(extensions.digest(p_key, 'sha256'), 'hex')
    else null
  end;
$$;

-- reserve_gift gains an optional guest key. Same locking and checks as before.
drop function if exists public.reserve_gift(uuid, text, text, text, text, text);

create or replace function public.reserve_gift(
  p_gift_id     uuid,
  p_guest_name  text,
  p_guest_email text default null,
  p_guest_phone text default null,
  p_message     text default null,
  p_client_hash text default null,
  p_guest_key   text default null
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
  v_key_hash  text := public.hash_guest_key(p_guest_key);
  v_ref       text;
  v_res_id    uuid;
  v_attempts  int;
  v_recent    int;
begin
  select * into v_settings from public.registry_settings where id = 1;

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

  loop
    v_ref := public.generate_reservation_reference();
    exit when not exists (select 1 from public.reservations where reference = v_ref);
  end loop;

  insert into public.reservations (reference, gift_id, gift_name_snapshot, price_aed_snapshot,
                                   guest_name, guest_email, guest_phone, message, client_hash, guest_key_hash)
  values (v_ref, v_gift.id, v_gift.name, v_gift.reference_price_aed,
          v_name, v_email, v_phone, v_message, v_client, v_key_hash)
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
    return jsonb_build_object('ok', false, 'error', 'unavailable',
      'message', 'Sorry — someone has just reserved this gift, so it is no longer available. Please choose another one from the list.');
end;
$$;

-- A guest's own pledges. Knowing the (unguessable) key is the credential; the
-- result contains no names, emails, phone numbers or messages.
create or replace function public.get_guest_pledges(p_guest_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'reference', r.reference,
           'status', r.status,
           'created_at', r.created_at,
           'gift_id', g.id,
           'gift_slug', g.slug,
           'gift_name', coalesce(g.name, r.gift_name_snapshot),
           'price_aed', r.price_aed_snapshot
         ) order by r.created_at desc), '[]'::jsonb)
    from public.reservations r
    left join public.gifts g on g.id = r.gift_id
   where public.hash_guest_key(p_guest_key) is not null
     and r.guest_key_hash = public.hash_guest_key(p_guest_key);
$$;

revoke execute on function public.hash_guest_key(text) from public, anon, authenticated;
revoke execute on function public.reserve_gift(uuid, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.reserve_gift(uuid, text, text, text, text, text, text) to service_role;
revoke execute on function public.get_guest_pledges(text) from public;
grant execute on function public.get_guest_pledges(text) to anon, authenticated;
