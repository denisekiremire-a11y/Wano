import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "../src/db";
import {
  bookingGuests,
  bookings,
  journeys,
  listings,
  plans,
  stamps,
  travellerProfiles,
  users,
  vendorProfiles,
} from "../src/db/schema";

// Plans, invites and group bookings: answers by invite link, the maker
// booking for everyone going, and guests getting the stamp and XP.
type FakeSession = { userId: string; role: "traveller" | "vendor" | "admin"; email: string };
const session = vi.hoisted(() => ({ current: { userId: "", role: "traveller", email: "" } as FakeSession }));
const jar = vi.hoisted(() => new Map<string, string>());

vi.mock("@/lib/auth", () => ({
  requireRole: vi.fn(async () => session.current),
  requireAdminLevel: vi.fn(async () => ({ ...session.current, adminLevel: "super" })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
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
vi.mock("@/lib/notify", () => ({ notifyAdmin: vi.fn(), notifyUser: vi.fn() }));
vi.mock("@/lib/admin-action-log", () => ({ logAdminAction: vi.fn() }));

import { createPlanAction, respondToPlanAction, startGroupBookingAction } from "@/lib/actions/plan-actions";
import { adminSetBookingStatusAction } from "@/lib/actions/admin-actions";
import { attachPlanGuests, getPlanView } from "@/lib/data/plans";
import { takeGroupPlanId } from "@/lib/group-plan-cookie";
import { getRewardsSummary } from "@/lib/data/rewards";

function suffix() {
  return Math.random().toString(36).slice(2, 10);
}
async function makeTraveller(name: string) {
  const [user] = await db
    .insert(users)
    .values({ email: `pl-${suffix()}@test.local`, passwordHash: "x", name, role: "traveller" })
    .returning();
  const [profile] = await db
    .insert(travellerProfiles)
    .values({ userId: user.id, displayName: name, referralCode: `PL${suffix().toUpperCase()}` })
    .returning();
  return { userId: user.id, id: profile.id };
}
const as = (t: { userId: string }) => (session.current = { userId: t.userId, role: "traveller", email: "t@test.local" });
const catchRedirect = (p: Promise<unknown>) => p.then(() => "", (e: { url?: string }) => e.url ?? Promise.reject(e));

let listingId: string;
let journeyId: string;

beforeAll(async () => {
  const [vu] = await db
    .insert(users)
    .values({ email: `pl-v-${suffix()}@test.local`, passwordHash: "x", name: "V", role: "vendor" })
    .returning();
  const [vendor] = await db
    .insert(vendorProfiles)
    .values({ userId: vu.id, businessName: "Banana Bar", location: "Bugolobi", description: "x", accreditationStatus: "trusted" })
    .returning();
  const [listing] = await db
    .insert(listings)
    .values({ vendorProfileId: vendor.id, title: "Banana Bar table", description: "x", priceMinor: 0 })
    .returning();
  listingId = listing.id;
  const [j] = await db.select({ id: journeys.id }).from(journeys).limit(1);
  journeyId = j.id;
});

async function makePlan(maker: { userId: string }) {
  as(maker);
  const fd = new FormData();
  fd.set("listingId", listingId);
  fd.set("date", "2030-01-10");
  fd.set("time", "19:30");
  const url = await catchRedirect(createPlanAction(undefined, fd));
  const id = url.split("/plans/")[1];
  return (await getPlanView({ id }))!;
}

describe("plans", () => {
  it("makes a plan at the place, with the maker going, in Kampala time", async () => {
    const maker = await makeTraveller("Joan");
    const plan = await makePlan(maker);
    expect(plan.title).toBe("Banana Bar table");
    expect(plan.startsAt.toISOString()).toBe("2030-01-10T16:30:00.000Z");
    expect(plan.members).toEqual([expect.objectContaining({ travellerId: maker.id, status: "going" })]);
  });

  it("lets anyone with the link answer, and change their answer", async () => {
    const plan = await makePlan(await makeTraveller("Joan"));
    const sam = await makeTraveller("Sam");
    as(sam);
    await respondToPlanAction(plan.inviteToken, "maybe");
    await respondToPlanAction(plan.inviteToken, "going");
    const view = await getPlanView({ id: plan.id });
    expect(view!.members.find((m) => m.travellerId === sam.id)?.status).toBe("going");
  });

  it("only lets the maker book for the group", async () => {
    const plan = await makePlan(await makeTraveller("Joan"));
    as(await makeTraveller("Sam"));
    await expect(startGroupBookingAction(plan.id)).rejects.toThrow(/Only the person/);
  });
});

describe("group bookings", () => {
  it("adds friends going to the maker's booking, up to the party size, once", async () => {
    const maker = await makeTraveller("Joan");
    const plan = await makePlan(maker);
    const friends = await Promise.all(["Sam", "Ali", "Peter"].map(makeTraveller));
    for (const f of friends) {
      as(f);
      await respondToPlanAction(plan.inviteToken, "going");
    }
    const maybe = await makeTraveller("Maybe");
    as(maybe);
    await respondToPlanAction(plan.inviteToken, "maybe");

    as(maker);
    expect(await catchRedirect(startGroupBookingAction(plan.id))).toBe(`/explore/${listingId}?group=1`);
    expect(await takeGroupPlanId()).toBe(plan.id);
    expect(await takeGroupPlanId()).toBeNull();

    const [booking] = await db
      .insert(bookings)
      .values({
        travellerId: maker.id,
        listingId,
        journeyId,
        partySize: 3,
        status: "pending",
        bookingRef: `PL-${suffix()}`,
      } as typeof bookings.$inferInsert)
      .returning();
    expect(await attachPlanGuests(plan.id, booking)).toBe(2);
    expect(await attachPlanGuests(plan.id, booking)).toBe(0);

    const guests = await db.select().from(bookingGuests).where(eq(bookingGuests.bookingId, booking.id));
    expect(guests.map((g) => g.travellerId).sort()).toEqual([friends[0].id, friends[1].id].sort());
    const [after] = await db.select().from(plans).where(eq(plans.id, plan.id));
    expect(after.bookingId).toBe(booking.id);

    // Confirming stamps the guests too; completing pays them booking XP.
    session.current = { userId: maker.userId, role: "admin", email: "a@test.local" };
    await adminSetBookingStatusAction(booking.id, "confirmed");
    const guestStamps = await db.select().from(stamps).where(eq(stamps.bookingId, booking.id));
    expect(guestStamps.map((s) => s.travellerId).sort()).toEqual([maker.id, friends[0].id, friends[1].id].sort());

    await adminSetBookingStatusAction(booking.id, "completed");
    const summary = await getRewardsSummary(friends[0].id, null, null);
    expect(summary.breakdown.find((b) => b.label === "Group outings with friends")).toMatchObject({ count: 1, points: 100 });
    const notOnIt = await getRewardsSummary(friends[2].id, null, null);
    expect(notOnIt.breakdown.find((b) => b.label === "Group outings with friends")?.count).toBe(0);
  });

  it("ignores a booking at a different place", async () => {
    const maker = await makeTraveller("Joan");
    const plan = await makePlan(maker);
    expect(
      await attachPlanGuests(plan.id, { id: plan.id, travellerId: maker.id, listingId: null, eventId: null, partySize: 4 }),
    ).toBe(0);
  });
});
