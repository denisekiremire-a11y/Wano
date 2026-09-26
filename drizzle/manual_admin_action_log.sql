-- Stage 1.3: a general, append-only audit trail across every admin-gated
-- mutating action — "who did what, to what, when". accreditation_reviews
-- (existing) stays as its own richer record for accreditation decisions
-- specifically; this is the cross-cutting feed shown at /admin/action-log
-- (super-only — see ADMIN_MIN_LEVEL in src/lib/admin-permissions.ts),
-- which also includes accreditation decisions for one unified view.

CREATE TABLE admin_action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL,
  target_type text,
  target_id uuid,
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_action_log_created_idx ON admin_action_log (created_at);
CREATE INDEX admin_action_log_actor_idx ON admin_action_log (actor_user_id);

-- This table has no legitimate non-admin read or write path at all (it
-- exists purely so admins can audit each other), so it gets the same
-- "fully private" treatment Round A gave vendor_documents/
-- vendor_submissions — both reads and writes are admin-only. Same
-- session-variable mechanism as Round A/B (see manual_rls_round_a.sql
-- and src/lib/db-context.ts) — app.role, set transaction-local by
-- withRlsContext.
--
-- IMPORTANT — same caveat as every prior RLS migration: FORCE ROW LEVEL
-- SECURITY has NO EFFECT on a Postgres superuser connection, only on a
-- non-superuser table owner. Confirm your production DATABASE_URL role
-- is not a superuser before treating this as real protection.
ALTER TABLE admin_action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_action_log FORCE ROW LEVEL SECURITY;

CREATE POLICY admin_action_log_admin_only ON admin_action_log FOR ALL USING (
  current_setting('app.role', true) = 'admin'
) WITH CHECK (
  current_setting('app.role', true) = 'admin'
);
