import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export type RlsContext = {
  userId: string;
  role: "traveller" | "vendor" | "admin";
  vendorProfileId?: string | null;
  travellerProfileId?: string | null;
};

/** A transaction handle from db.transaction(async (tx) => ...) — same
 * query-builder surface as `db` itself, so a function typed to take
 * DbOrTx can be called with either interchangeably. */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbOrTx = typeof db | Tx;

/** Wraps a block of queries in a transaction with this request's identity
 * set as transaction-local Postgres session variables (SET LOCAL via
 * set_config's third arg), which the RLS policies in
 * drizzle/manual_rls_round_a.sql read via current_setting(...). SET LOCAL
 * auto-resets at commit/rollback, so this is safe to use against a pooled
 * connection with no risk of one request's identity leaking into the next.
 *
 * This is real, additional enforcement underneath the app-level ownership
 * checks that already exist (requireRole + "does this row belong to you"
 * lookups) — not a replacement for them. Every call site still does its
 * normal check first; this is the belt-and-suspenders layer that holds
 * even if a future change accidentally drops one of those checks.
 *
 * IMPORTANT: FORCE ROW LEVEL SECURITY (set on every table these policies
 * cover) has no effect on a Postgres superuser connection — only on a
 * non-superuser table owner. If DATABASE_URL's role is a superuser, none
 * of this is actually enforced. Confirm your production role isn't one. */
export async function withRlsContext<T>(
  ctx: RlsContext,
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      select
        set_config('app.user_id', ${ctx.userId}, true),
        set_config('app.role', ${ctx.role}, true),
        set_config('app.vendor_profile_id', ${ctx.vendorProfileId ?? ""}, true),
        set_config('app.traveller_profile_id', ${ctx.travellerProfileId ?? ""}, true)
    `);
    return fn(tx);
  });
}
