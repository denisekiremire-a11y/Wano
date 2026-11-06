import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "../src/db";
import { users } from "../src/db/schema";

// Confirms the fix for a real gap: users.suspendedAt was set by the
// moderation "suspend" action but never read anywhere — a suspended
// account could still log in, and any already-active session kept
// working for the rest of its 30-day lifetime. These tests exercise the
// real auth.ts/auth-actions.ts code (only next/headers and next/navigation
// are mocked) against the real local database, the same way the rls-*
// tests do, since this is fundamentally DB-backed logic.

const jar = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined),
    set: (k: string, v: string) => jar.set(k, v),
    delete: (k: string) => jar.delete(k),
  })),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));

import { hashPassword, requireSession } from "@/lib/auth";
import { loginAction } from "@/lib/actions/auth-actions";
import { createSessionCookie, SESSION_COOKIE } from "@/lib/session";

const email = `suspension-test-${Date.now()}@example.com`;
const password = "correct-horse-battery";
let userId: string;

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: await hashPassword(password), name: "Suspension Test", role: "traveller" })
    .returning();
  userId = user.id;
});

describe("suspended users", () => {
  it("can log in and use the app while not suspended", async () => {
    jar.clear();
    await createSessionCookie({ userId, role: "traveller", email, name: "Suspension Test", adminLevel: null });
    const session = await requireSession();
    expect(session.userId).toBe(userId);
  });

  it("requireSession kicks out an already-active session the moment it's suspended", async () => {
    jar.clear();
    await createSessionCookie({ userId, role: "traveller", email, name: "Suspension Test", adminLevel: null });
    expect(jar.has(SESSION_COOKIE)).toBe(true);

    await db.update(users).set({ suspendedAt: new Date() }).where(eq(users.id, userId));

    await expect(requireSession()).rejects.toMatchObject({ url: "/login?suspended=1" });
    // requireSession clears the stale cookie on its way out, not just the
    // redirect — otherwise the same request loop would keep hitting this
    // same check on every subsequent navigation instead of landing on login.
    expect(jar.has(SESSION_COOKIE)).toBe(false);

    await db.update(users).set({ suspendedAt: null }).where(eq(users.id, userId));
  });

  it("loginAction refuses a suspended account even with the correct password", async () => {
    jar.clear();
    await db.update(users).set({ suspendedAt: new Date() }).where(eq(users.id, userId));

    const fd = new FormData();
    fd.set("email", email);
    fd.set("password", password);
    const result = await loginAction({}, fd);

    expect(result).toEqual({ error: "This account has been suspended. Contact support if you think this is a mistake." });
    expect(jar.has(SESSION_COOKIE)).toBe(false);

    await db.update(users).set({ suspendedAt: null }).where(eq(users.id, userId));
  });
});
