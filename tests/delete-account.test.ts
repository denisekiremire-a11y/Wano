import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "../src/db";
import { follows, posts, travellerProfiles, users, vendorProfiles, venueCheckIns } from "../src/db/schema";

// Real-DB test for "Delete my account": personal details and published
// content go, visit/booking history stays attached to an anonymous profile.
type FakeSession = { userId: string; role: "traveller"; email: string };
const session = vi.hoisted(() => ({ current: { userId: "", role: "traveller", email: "" } as FakeSession }));
const signedOut = vi.hoisted(() => ({ count: 0 }));

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  requireRole: vi.fn(async () => session.current),
}));
vi.mock("@/lib/session", () => ({
  clearSessionCookie: vi.fn(async () => {
    signedOut.count++;
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));

import { deleteMyAccountAction } from "@/lib/actions/account-actions";
import { recordCheckIn } from "@/lib/data/check-ins";
import { DELETED_MEMBER_NAME, deletedAccountEmail } from "@/lib/account-deletion";

function suffix() {
  return Math.random().toString(36).slice(2, 10);
}

async function makeTraveller(name: string) {
  const [user] = await db
    .insert(users)
    .values({ email: `ci-del-${suffix()}@test.local`, passwordHash: "x", name, role: "traveller", bio: "Hi", emailVerifiedAt: new Date() })
    .returning();
  const [profile] = await db
    .insert(travellerProfiles)
    .values({ userId: user.id, displayName: name, referralCode: `DEL${suffix().toUpperCase()}`, phone: "+256700000000", city: "Kampala" })
    .returning();
  return { userId: user.id, travellerId: profile.id, email: user.email };
}

function form(confirm: string) {
  const fd = new FormData();
  fd.set("confirm", confirm);
  return fd;
}

describe("delete my account", () => {
  it("needs DELETE typed to confirm", async () => {
    const t = await makeTraveller("Amina");
    session.current = { userId: t.userId, role: "traveller", email: t.email };
    expect(await deleteMyAccountAction({}, form("yes"))).toEqual({ error: "Type DELETE in the box to confirm." });
    const [u] = await db.select().from(users).where(eq(users.id, t.userId));
    expect(u.name).toBe("Amina");
  });

  it("removes personal details and posts, keeps visit history, signs out", async () => {
    const t = await makeTraveller("Amina");
    const friend = await makeTraveller("Brian");
    const [vendorUser] = await db
      .insert(users)
      .values({ email: `ci-del-v-${suffix()}@test.local`, passwordHash: "x", name: "Vendor", role: "vendor" })
      .returning();
    const [vendor] = await db
      .insert(vendorProfiles)
      .values({ userId: vendorUser.id, businessName: `Cafe ${suffix()}`, location: "Kololo", description: "Test", accreditationStatus: "trusted" })
      .returning();

    await db.insert(posts).values({ travellerId: t.travellerId, content: "Loved Kololo" });
    await db.insert(follows).values({ followerId: friend.travellerId, followingId: t.travellerId });
    await recordCheckIn(t.travellerId, vendor.id, "qr", new Date());

    session.current = { userId: t.userId, role: "traveller", email: t.email };
    const before = signedOut.count;
    await expect(deleteMyAccountAction({}, form("delete"))).rejects.toMatchObject({ url: "/account-deleted" });
    expect(signedOut.count).toBe(before + 1);

    const [u] = await db.select().from(users).where(eq(users.id, t.userId));
    expect(u).toMatchObject({ name: DELETED_MEMBER_NAME, email: deletedAccountEmail(t.userId), bio: null, emailVerifiedAt: null });
    expect(u.passwordHash).not.toBe("x");
    expect(u.suspendedAt).not.toBeNull();

    const [p] = await db.select().from(travellerProfiles).where(eq(travellerProfiles.id, t.travellerId));
    expect(p).toMatchObject({ displayName: DELETED_MEMBER_NAME, phone: null, city: null, showActivityInFeed: false });

    expect(await db.select().from(posts).where(eq(posts.travellerId, t.travellerId))).toHaveLength(0);
    expect(await db.select().from(follows).where(eq(follows.followingId, t.travellerId))).toHaveLength(0);
    expect(await db.select().from(venueCheckIns).where(eq(venueCheckIns.travellerId, t.travellerId))).toHaveLength(1);

    // The real email is free to sign up again.
    expect(await db.select().from(users).where(eq(users.email, t.email))).toHaveLength(0);
  });
});
