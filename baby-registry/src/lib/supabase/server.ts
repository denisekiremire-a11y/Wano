import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requirePublicConfig } from "../env";

/**
 * Cookie-aware client acting as the signed-in user (admin pages and actions).
 * RLS applies: non-admins cannot read private data even if they reach this code.
 */
export async function getServerSupabase(): Promise<SupabaseClient> {
  const { url, key } = requirePublicConfig();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there. The proxy refreshes
          // sessions, so this is safe to ignore.
        }
      },
    },
  });
}

/** Anonymous, cookie-less client for public catalogue reads (same access as any guest). */
export function getPublicSupabase(): SupabaseClient {
  const { url, key } = requirePublicConfig();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
