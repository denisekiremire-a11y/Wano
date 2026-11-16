import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

export const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const DB_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

if (!URL || !PUBLIC_KEY || !SECRET_KEY) throw new Error("DB tests need a running local Supabase and .env.local (see docs/TESTING.md)");

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
export const anon = (): SupabaseClient => createClient(URL, PUBLIC_KEY, opts);
export const service = (): SupabaseClient => createClient(URL, SECRET_KEY, opts);

export const pool = new pg.Pool({ connectionString: DB_URL, max: 40 });

/** Create a Supabase Auth user and return a client signed in as them. */
export async function signedInUser(opts2: { admin: boolean }): Promise<{ client: SupabaseClient; userId: string; email: string }> {
  const email = `test-${randomUUID().slice(0, 8)}@example.test`;
  const password = `pw-${randomUUID()}`;
  const svc = service();
  const { data, error } = await svc.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  if (opts2.admin) {
    const r = await svc.from("admin_profiles").insert({ user_id: data.user.id });
    if (r.error) throw r.error;
  }
  const client = createClient(URL, PUBLIC_KEY, opts);
  const s = await client.auth.signInWithPassword({ email, password });
  if (s.error) throw s.error;
  return { client, userId: data.user.id, email };
}

export async function deleteUser(userId: string) {
  await service().auth.admin.deleteUser(userId);
}

const created: string[] = [];

/** A fresh, isolated gift for one test (created with the service role). */
export async function makeGift(name = "Test gift"): Promise<string> {
  const { rows: cats } = await pool.query("select id from public.categories order by sort_order limit 1");
  const slug = `test-${randomUUID()}`;
  const { rows } = await pool.query(
    "insert into public.gifts (slug, category_id, name, price_aed, price_basis) values ($1, $2, $3, 100, 'shelf_tag') returning id",
    [slug, cats[0].id, name],
  );
  created.push(rows[0].id);
  return rows[0].id;
}

export async function cleanupGifts() {
  if (!created.length) return;
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query("select set_config('registry.allow_status_change', 'on', true)");
    await c.query("delete from public.reservations where gift_id = any($1::uuid[])", [created]);
    await c.query("delete from public.gifts where id = any($1::uuid[])", [created]);
    await c.query("commit");
  } finally {
    c.release();
  }
  created.length = 0;
}

export const uniqueClient = () => `test-client-${randomUUID()}`;

/** Call reserve_gift exactly as the Next.js server does (service role via the API). */
export async function reserve(giftId: string, name = "Test Guest", extra: Record<string, unknown> = {}) {
  const { data, error } = await service().rpc("reserve_gift", {
    p_gift_id: giftId,
    p_guest_name: name,
    p_guest_email: null,
    p_guest_phone: null,
    p_message: null,
    p_client_hash: uniqueClient(),
    ...extra,
  });
  if (error) throw error;
  return data as { ok: boolean; error?: string; reference?: string; message?: string };
}
