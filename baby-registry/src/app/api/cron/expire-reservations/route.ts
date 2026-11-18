import { timingSafeEqual } from "node:crypto";
import { getServiceSupabase } from "@/lib/supabase/service";

/**
 * Optional reservation expiry. Does nothing unless an administrator has enabled expiry in
 * Admin → Settings (the database function checks that flag itself). Protected by CRON_SECRET;
 * Vercel Cron sends it as a Bearer token.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const { data, error } = await getServiceSupabase().rpc("release_expired_reservations");
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, released: data });
}
