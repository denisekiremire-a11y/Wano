-- password_reset_tokens had sat in schema.ts since "Wano additions Part B"
-- with no code ever reading or writing it, and no RLS policy — the table
-- existed but the feature it was for was never built. Now that the
-- forgot-password flow actually uses it, give it the same protection
-- email_verification_tokens already has (see manual_wano_additions.sql):
-- looked up by raw token value from an unauthenticated reset-link click,
-- so the request/consume actions run under withRlsContext({role: "admin"})
-- — same trusted-system-write reasoning as voucher-code lookup and email
-- verification. Admin-only for everything; there is no legitimate
-- traveller-session read of this table at all.
--
-- Same caveat as every prior round: FORCE ROW LEVEL SECURITY has no effect
-- on a Postgres superuser connection, only on a non-superuser table owner.

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens FORCE ROW LEVEL SECURITY;

CREATE POLICY password_reset_tokens_admin_only ON password_reset_tokens FOR ALL USING (
  current_setting('app.role', true) = 'admin'
) WITH CHECK (
  current_setting('app.role', true) = 'admin'
);
