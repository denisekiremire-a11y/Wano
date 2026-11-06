import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "../src/db";
import { travellerProfiles, users } from "../src/db/schema";

// requireVerifiedTraveller's phone check only matters while
// PAID_BOOKINGS_ENABLED is on — travellerProfiles.phoneVerifiedAt's own
// schema comment says that's what it was always scoped to, and every
// booking today stays pay-at-venue regardless of the flag. This file
// forces the flag on to exercise that enforcement directly; the sibling
// file (phone-verification-gate-off.test.ts) runs with the real,
// flag-off env to confirm there's no regression to today's behavior.
vi.mock("@/lib/feature-flags", () => ({ PAID_BOOKINGS_ENABLED: true }));

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

const email = `phone-gate-on-${Date.now()}@example.com`;
let userId: string;
let travellerId: string;

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash: await hashPassword("whatever-password-1"),
      name: "Phone Gate Test",
      role: "traveller",
      emailVerifiedAt: new Date(),
    })
    .returning();
  userId = user.id;

  const [traveller] = await db
    .insert(travellerProfiles)
    .values({ userId, displayName: "Phone Gate Test", referralCode: `PGT${Date.now()}` })
    .returning();
  travellerId = traveller.id;

  await createSessionCookie({ userId, role: "traveller", email, name: "Phone Gate Test", adminLevel: null });
});

describe("requireVerifiedTraveller phone gate, PAID_BOOKINGS_ENABLED=true", () => {
  it("blocks a booking when the email is verified but the phone isn't", async () => {
    const result = await requireVerifiedTraveller();
    expect(result).toEqual({
      error: "Verify your phone number before sending a booking request — you can do this from your account.",
    });
  });

  it("allows it once the phone is verified too", async () => {
    await db.update(travellerProfiles).set({ phoneVerifiedAt: new Date() }).where(eq(travellerProfiles.id, travellerId));
    const result = await requireVerifiedTraveller();
    expect(result.session?.userId).toBe(userId);
  });
});
