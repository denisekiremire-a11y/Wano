"use server";

import { randomBytes } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { withRlsContext } from "@/lib/db-context";
import { sendEmail } from "@/lib/email";
import { requestPasswordResetSchema, resetPasswordSchema, type ActionState } from "@/lib/validation";

function token() {
  return randomBytes(24).toString("hex");
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const TOKEN_TTL_HOURS = 1;

/** Always the same generic success message whether or not the email is
 * registered — telling the caller "no account with that email" here (the
 * way loginAction does) would turn a password-reset form into a free
 * account-enumeration tool, which is a worse tradeoff than it is on login
 * where the caller has already proven *something* by attempting a
 * password. */
type RequestResetState = { error?: string; ok?: string };

const GENERIC_SUCCESS: RequestResetState = {
  ok: "If an account exists for that email, we've sent a link to reset your password.",
};

export async function requestPasswordResetAction(
  _prev: RequestResetState | undefined,
  formData: FormData,
): Promise<RequestResetState> {
  const parsed = requestPasswordResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Enter a valid email address." };

  const [user] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (!user) return GENERIC_SUCCESS;

  const resetToken = token();
  await withRlsContext({ role: "admin" }, (tx) =>
    tx.insert(passwordResetTokens).values({
      userId: user.id,
      token: resetToken,
      expiresAt: new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000),
    }),
  );

  await sendEmail({
    to: user.email,
    subject: "Reset your Wano password",
    html: `<p>Click to reset your password: <a href="${APP_URL}/reset-password?token=${resetToken}">${APP_URL}/reset-password?token=${resetToken}</a></p><p>This link expires in ${TOKEN_TTL_HOURS} hour${TOKEN_TTL_HOURS === 1 ? "" : "s"}. If you didn't request this, you can ignore this email.</p>`,
  });

  return GENERIC_SUCCESS;
}

/** Looks up a raw reset token outside any form submission, same "is this
 * link even still good" check verifyEmailAction does for /verify-email —
 * used to decide whether /reset-password shows the set-new-password form
 * or an "this link isn't valid" message, before the traveller types
 * anything. */
export async function checkPasswordResetTokenAction(rawToken: string): Promise<{ ok: boolean }> {
  const trimmed = rawToken.trim();
  if (!trimmed) return { ok: false };

  return withRlsContext({ role: "admin" }, async (tx) => {
    const [row] = await tx
      .select({ id: passwordResetTokens.id })
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, trimmed),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return { ok: Boolean(row) };
  });
}

export async function resetPasswordAction(_prev: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Enter a password that's at least 8 characters." };

  const result = await withRlsContext({ role: "admin" }, async (tx) => {
    const [row] = await tx
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, parsed.data.token),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!row) return { error: "This reset link has expired or has already been used — request a new one." };

    // Single-use via a conditional UPDATE, not just the read above — two
    // tabs submitting the same link at once can't both succeed, same
    // reasoning as markRewardRedeemedAction's redemption guard.
    const [claimed] = await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.id, row.id), isNull(passwordResetTokens.usedAt)))
      .returning({ userId: passwordResetTokens.userId });
    if (!claimed) return { error: "This reset link has expired or has already been used — request a new one." };

    await tx.update(users).set({ passwordHash: await hashPassword(parsed.data.password) }).where(eq(users.id, claimed.userId));
    return { ok: true } as const;
  });

  // redirect() throws to abort rendering — called here, outside
  // withRlsContext's transaction, so the password/token-used writes above
  // have already committed before it fires, instead of being rolled back.
  if ("error" in result) return result;
  redirect("/login?reset=1");
}
