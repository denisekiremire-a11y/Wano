import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getServerSupabase } from "./supabase/server";

export interface AdminContext {
  supabase: SupabaseClient;
  user: User;
}

/**
 * Server-side admin check. Returns `{ notAdmin: true }` instead of redirecting, for route
 * handlers (CSV exports) that must answer with a status code.
 */
export async function getAdmin(): Promise<AdminContext | { supabase: SupabaseClient; user: User | null; notAdmin: true }> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, notAdmin: true };
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || isAdmin !== true) return { supabase, user, notAdmin: true };
  return { supabase, user };
}

/** Server-side admin gate for every admin page and server action; redirects non-admins to login. */
export async function requireAdmin(): Promise<AdminContext> {
  const ctx = await getAdmin();
  if ("notAdmin" in ctx) {
    if (!ctx.user) redirect("/admin/login");
    redirect("/admin/login?error=not-admin");
  }
  return ctx;
}
