import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "../src/db";
import { users } from "../src/db/schema";

// loginAction used to return a distinct message for "no account with
// that email" vs "incorrect password" — letting the login form be used
// to enumerate which emails are registered. Confirms both failure modes
// now give the identical generic message.

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

import { hashPassword } from "@/lib/auth";
import { loginAction } from "@/lib/actions/auth-actions";

const email = `enum-test-${Date.now()}@example.com`;
const correctPassword = "the-correct-password-1";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeAll(async () => {
  await db.insert(users).values({
    email,
    passwordHash: await hashPassword(correctPassword),
    name: "Enumeration Test",
    role: "traveller",
  });
});

describe("loginAction", () => {
  it("gives the same error for a nonexistent email as for a wrong password", async () => {
    const unknownEmail = await loginAction({}, form({ email: "nobody-registered@example.com", password: "whatever12" }));
    const wrongPassword = await loginAction({}, form({ email, password: "definitely-wrong-1" }));

    expect(unknownEmail).toEqual({ error: "Incorrect email or password." });
    expect(wrongPassword).toEqual({ error: "Incorrect email or password." });
  });

  it("still logs in with the correct email and password", async () => {
    jar.clear();
    const err = await loginAction({}, form({ email, password: correctPassword })).catch((e: unknown) => e);
    expect((err as Error & { url?: string }).url).toBeDefined();
  });
});
