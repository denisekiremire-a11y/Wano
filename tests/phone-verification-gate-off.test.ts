import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "../src/db";
import { travellerProfiles, users } from "../src/db/schema";

// Confirms no regression: with PAID_BOOKINGS_ENABLED off (the real,
// unmocked test env — every booking stays pay-at-venue today), a
// traveller with a verified email but an unverified phone can still get
// past requireVerifiedTraveller, exactly as before this change. See the
// sibling file (phone-verification-gate.test.ts) for the flag-on case.

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

import { hashPassword, requireVerifiedTraveller } from "@/lib/auth";
import { createSessionCookie } from "@/lib/session";

const email = `phone-gate-off-${Date.now()}@example.com`;
let userId: string;

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash: await hashPassword("whatever-password-2"),
      name: "Phone Gate Off Test",
      role: "traveller",
      emailVerifiedAt: new Date(),
    })
    .returning();
  userId = user.id;

  // phoneVerifiedAt deliberately left null — the point of this test.
  await db.insert(travellerProfiles).values({ userId, displayName: "Phone Gate Off Test", referralCode: `PGO${Date.now()}` });

  await createSessionCookie({ userId, role: "traveller", email, name: "Phone Gate Off Test", adminLevel: null });
});

describe("requireVerifiedTraveller phone gate, PAID_BOOKINGS_ENABLED=false (default)", () => {
  it("does not block booking on an unverified phone", async () => {
    const result = await requireVerifiedTraveller();
    expect(result.session?.userId).toBe(userId);
  });
});
