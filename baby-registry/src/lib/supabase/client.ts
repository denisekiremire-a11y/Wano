"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/** Browser client (publishable key only). Used for realtime and admin image uploads. */
export function getBrowserSupabase(url: string, key: string): SupabaseClient {
  if (!browserClient) {
    browserClient = createBrowserClient(url, key);
  }
  return browserClient;
}
