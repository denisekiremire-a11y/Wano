import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "../src/db";
import { passwordResetTokens, users } from "../src/db/schema";

// password_reset_tokens sat in schema.ts unused since "Wano additions Part
// B" — no action ever read or wrote it, so there was no self-service
// password recovery at all. These tests exercise the real actions against
// the real local database (same reasoning as auth-suspension.test.ts: this
// is fundamentally DB-backed logic, not worth faking).

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));

import { hashPassword, verifyPassword } from "@/lib/auth";
import {
  checkPasswordResetTokenAction,
  requestPasswordResetAction,
  resetPasswordAction,
} from "@/lib/actions/password-reset-actions";

const GENERIC_SUCCESS = "If an account exists for that email, we've sent a link to reset your password.";
const email = `reset-test-${Date.now()}@example.com`;
const originalPassword = "original-password-1";
let userId: string;

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: await hashPassword(originalPassword), name: "Reset Test", role: "traveller" })
    .returning();
  userId = user.id;
});

describe("requestPasswordResetAction", () => {
  it("gives the same generic message for an email that isn't registered, and issues no token", async () => {
    const result = await requestPasswordResetAction(undefined, form({ email: "nobody-here@example.com" }));
    expect(result).toEqual({ ok: GENERIC_SUCCESS });
  });

  it("issues a single-use, time-limited token for a real account, with the same generic message", async () => {
    const result = await requestPasswordResetAction(undefined, form({ email }));
    expect(result).toEqual({ ok: GENERIC_SUCCESS });

    const rows = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    expect(rows).toHaveLength(1);
    expect(rows[0].usedAt).toBeNull();
    expect(rows[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("checkPasswordResetTokenAction / resetPasswordAction", () => {
  it("rejects an unknown token", async () => {
    expect(await checkPasswordResetTokenAction("not-a-real-token")).toEqual({ ok: false });
  });

  it("accepts a fresh token, lets it set a new password once, and refuses reuse", async () => {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    const [row] = await db
      .insert(passwordResetTokens)
      .values({ userId, token: `fresh-token-${Date.now()}`, expiresAt: new Date(Date.now() + 60 * 60 * 1000) })
      .returning();

    expect(await checkPasswordResetTokenAction(row.token)).toEqual({ ok: true });

    const newPassword = "brand-new-password-2";
    const err = await resetPasswordAction(undefined, form({ token: row.token, password: newPassword })).catch(
      (e: unknown) => e,
    );
    expect((err as Error & { url?: string }).url).toBe("/login?reset=1");

    const [updatedUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    expect(await verifyPassword(newPassword, updatedUser.passwordHash)).toBe(true);
    expect(await verifyPassword(originalPassword, updatedUser.passwordHash)).toBe(false);

    // Single-use: the same link can't be submitted again, even though the
    // password was already changed successfully above.
    expect(await checkPasswordResetTokenAction(row.token)).toEqual({ ok: false });
    const result = await resetPasswordAction(undefined, form({ token: row.token, password: "yet-another-password-3" }));
    expect(result).toEqual({ error: "This reset link has expired or has already been used — request a new one." });
  });

  it("rejects an expired token", async () => {
    const [row] = await db
      .insert(passwordResetTokens)
      .values({ userId, token: `expired-token-${Date.now()}`, expiresAt: new Date(Date.now() - 1000) })
      .returning();

    expect(await checkPasswordResetTokenAction(row.token)).toEqual({ ok: false });
    const result = await resetPasswordAction(undefined, form({ token: row.token, password: "another-password-4" }));
    expect(result).toEqual({ error: "This reset link has expired or has already been used — request a new one." });
  });
});
