import { and, eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "../src/db";
import { bookings, eventAttendance, events, follows, travellerProfiles, users, vendorProfiles } from "../src/db/schema";

// Friend finding: joining from a friend's link connects the two, the home
// cards say which friends are going, and the inviter earns XP when the
// friend makes a first verified visit.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));
vi.mock("@/lib/session", () => ({ createSessionCookie: vi.fn(), clearSessionCookie: vi.fn(), getSession: vi.fn() }));
vi.mock("@/lib/notify", () => ({ notifyAdmin: vi.fn(), notifyUser: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ logEvent: vi.fn() }));
vi.mock("@/lib/actions/email-verification-actions", () => ({ sendVerificationEmail: vi.fn() }));

import { signupAction } from "@/lib/actions/auth-actions";
import { recordCheckIn } from "@/lib/data/check-ins";
import { friendsGoingLabel, getFriendsGoingByEvent } from "@/lib/data/events";
import { getXpEarnedLast12Months } from "@/lib/data/rewards";
import { FRIEND_FIRST_VISIT_XP } from "@/lib/rewards-config";
import { inviteLinks } from "@/lib/invite-link";

function suffix() {
  return Math.random().toString(36).slice(2, 10);
}

async function makeTraveller(name = "Joan Nakato") {
  const [user] = await db
    .insert(users)
    .values({ email: `fr-${suffix()}@test.local`, passwordHash: "x", name, role: "traveller" })
    .returning();
  const [profile] = await db
    .insert(travellerProfiles)
    .values({ userId: user.id, displayName: name, referralCode: `FR${suffix().toUpperCase()}` })
    .returning();
  return profile;
}

async function signUpWithRef(ref: string) {
  const fd = new FormData();
  fd.set("role", "traveller");
  fd.set("name", "Sam Okello");
  fd.set("email", `fr-new-${suffix()}@test.local`);
  fd.set("password", "WanoTest-12345!");
  fd.set("ref", ref);
  await signupAction({}, fd).catch((e: { url?: string }) => {
    if (!e.url) throw e;
  });
  const [user] = await db.select().from(users).where(eq(users.email, fd.get("email") as string));
  const [profile] = await db.select().from(travellerProfiles).where(eq(travellerProfiles.userId, user.id));
  return profile;
}

describe("joining from a friend's link", () => {
  it("makes the two members follow each other", async () => {
    const joan = await makeTraveller();
    const sam = await signUpWithRef(joan.referralCode!);
    expect(sam.referredByTravellerId).toBe(joan.id);
    const both = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, sam.id), eq(follows.followingId, joan.id)));
    const back = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, joan.id), eq(follows.followingId, sam.id)));
    expect(both).toHaveLength(1);
    expect(back).toHaveLength(1);
  });

  it("pays the inviter XP once, on the friend's first verified visit", async () => {
    const joan = await makeTraveller();
    const sam = await signUpWithRef(joan.referralCode!);
    const [vendorUser] = await db
      .insert(users)
      .values({ email: `fr-v-${suffix()}@test.local`, passwordHash: "x", name: "V", role: "vendor" })
      .returning();
    const [vendor] = await db
      .insert(vendorProfiles)
      .values({ userId: vendorUser.id, businessName: "Muyenga Cafe", location: "Muyenga", description: "x", accreditationStatus: "trusted" })
      .returning();

    const before = await getXpEarnedLast12Months(joan.id);
    await recordCheckIn(sam.id, vendor.id, "qr");
    await recordCheckIn(sam.id, vendor.id, "qr", new Date(Date.now() + 24 * 60 * 60 * 1000));
    expect((await getXpEarnedLast12Months(joan.id)) - before).toBe(FRIEND_FIRST_VISIT_XP);
  });
});

describe("friends going", () => {
  it("names followed members who booked or said they're going", async () => {
    const me = await makeTraveller("Amina Nambi");
    const joan = await makeTraveller("Joan Nakato");
    const peter = await makeTraveller("Peter Mugisha");
    const stranger = await makeTraveller("Not Followed");
    await db.insert(follows).values([
      { followerId: me.id, followingId: joan.id },
      { followerId: me.id, followingId: peter.id },
    ]);
    const [event] = await db
      .insert(events)
      .values({
        title: "Jazz night",
        description: "x",
        category: "music",
        startAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
        location: "Kololo",
      })
      .returning();
    await db.insert(bookings).values({
      travellerId: joan.id,
      eventId: event.id,
      status: "confirmed",
      bookingRef: `FR-${suffix()}`,
    } as typeof bookings.$inferInsert);
    await db.insert(eventAttendance).values([
      { eventId: event.id, travellerId: joan.id, status: "going" },
      { eventId: event.id, travellerId: peter.id, status: "going" },
      { eventId: event.id, travellerId: stranger.id, status: "going" },
    ]);

    const map = await getFriendsGoingByEvent(me.id, [event.id]);
    expect(map.get(event.id)?.sort()).toEqual(["Joan", "Peter"]);
  });

  it("writes a short line", () => {
    expect(friendsGoingLabel([])).toBeNull();
    expect(friendsGoingLabel(["Joan"])).toBe("Joan is going");
    expect(friendsGoingLabel(["Joan", "Sam"])).toBe("Joan and Sam are going");
    expect(friendsGoingLabel(["Joan", "Sam", "Peter", "Ali"])).toBe("Joan and 3 friends are going");
  });

  it("builds a WhatsApp invite with the join link", () => {
    const { joinUrl, whatsappUrl } = inviteLinks("ABC1234", "Joan");
    expect(joinUrl).toMatch(/\/join\?ref=ABC1234$/);
    expect(decodeURIComponent(whatsappUrl.split("text=")[1])).toContain(joinUrl);
  });
});
