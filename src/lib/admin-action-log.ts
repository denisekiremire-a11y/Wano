import "server-only";
import { adminActionLog } from "@/db/schema";
import { withRlsContext } from "@/lib/db-context";

/** Records one row in the cross-cutting admin audit trail (Stage 1.3) —
 * call this right after the mutating write it's describing, same
 * "insert immediately after, not wrapped in the same transaction" pattern
 * accreditationReviews already uses elsewhere. Always runs under its own
 * admin-equivalent RLS context (admin_action_log is admin-only, and most
 * call sites don't otherwise carry one) — never swallows an error: a
 * logging bug here is a real bug, not something to hide from the caller. */
export async function logAdminAction(
  actorUserId: string,
  action: string,
  summary: string,
  target?: { type: string; id: string } | null,
): Promise<void> {
  await withRlsContext({ userId: actorUserId, role: "admin" }, (tx) =>
    tx.insert(adminActionLog).values({
      actorUserId,
      action,
      summary,
      targetType: target?.type ?? null,
      targetId: target?.id ?? null,
    }),
  );
}
