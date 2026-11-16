import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ConfigError, supabaseUrl } from "../env";

/**
 * Service-role client. SERVER ONLY — the `server-only` import makes the build fail if this
 * module is ever imported into client code. Used exclusively to call reserve_gift() and the
 * optional expiry job; it never returns private data to the browser.
 */
export function getServiceSupabase(): SupabaseClient {
  const url = supabaseUrl();
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new ConfigError("SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) is not set on the server.");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
