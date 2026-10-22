"use server";

import { randomBytes } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { emailVerificationTokens, users } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { withRlsContext } from "@/lib/db-context";
import { requireSession } from "@/lib/auth";
import type { ActionState } from "@/lib/validation";

function token() {
  return randomBytes(24).toString("hex");
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const TOKEN_TTL_HOURS = 48;

// email_verification_tokens is admin-only under RLS (see
// manual_wano_additions.sql) — the real access control is the raw token
// value itself, unguessable and emailed only to the account's own address,
// same trusted-system-write reasoning as voucher-code lookup.
export async function sendVerificationEmail(userId: string, email: string) {
  const verifyToken = token();
  await withRlsContext({ role: "admin" }, (tx) =>
    tx.insert(emailVerificationTokens).values({
      userId,
      token: verifyToken,
      expiresAt: new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000),
    }),
  );

  await sendEmail({
    to: email,
    subject: "Verify your Wano email",
    html: `<p>Click to verify your email: <a href="${APP_URL}/verify-email?token=${verifyToken}">${APP_URL}/verify-email?token=${verifyToken}</a></p><p>This link expires in ${TOKEN_TTL_HOURS} hours.</p>`,
  });
}

export async function resendVerificationEmailAction(): Promise<ActionState> {
  const session = await requireSession();
  const [row] = await db.select({ emailVerifiedAt: users.emailVerifiedAt }).from(users).where(eq(users.id, session.userId)).limit(1);
  if (row?.emailVerifiedAt) return { error: "Your email is already verified." };

  await sendVerificationEmail(session.userId, session.email);
  return {};
}

export async function verifyEmailAction(rawToken: string): Promise<{ ok: boolean; alreadyUsed: boolean }> {
  const trimmed = rawToken.trim();
  if (!trimmed) return { ok: false, alreadyUsed: false };

  return withRlsContext({ role: "admin" }, async (tx) => {
    const [row] = await tx
      .select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.token, trimmed),
          isNull(emailVerificationTokens.usedAt),
          gt(emailVerificationTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!row) {
      const [usedRow] = await tx
        .select({ id: emailVerificationTokens.id })
        .from(emailVerificationTokens)
        .where(eq(emailVerificationTokens.token, trimmed))
        .limit(1);
      return { ok: false, alreadyUsed: Boolean(usedRow) };
    }

    await tx.update(emailVerificationTokens).set({ usedAt: new Date() }).where(eq(emailVerificationTokens.id, row.id));
    await tx.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, row.userId));

    return { ok: true, alreadyUsed: false };
  });
}
