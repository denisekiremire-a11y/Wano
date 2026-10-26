import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "../src/db";
import { travellerProfiles, users, vendorProfiles, venueCheckIns, visitorCodes } from "../src/db/schema";

// Real-DB tests for verified visits: a venue scanning a member's QR (or
// typing the backup code) logs one visit a day, which completes weekly
// challenges and neighbourhood stamps, and those pay Passport XP.
type FakeSession = { userId: string; role: "traveller" | "vendor"; email: string };
const session = vi.hoisted(() => ({ current: { userId: "", role: "vendor", email: "" } as FakeSession }));

vi.mock("@/lib/auth", () => ({ requireRole: vi.fn(async () => session.current) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));

import { checkInVisitorAction, getVisitorCodeAction, lookupVisitorCodeAction } from "@/lib/actions/check-in-actions";
import { CODE_FAILURE_LIMIT, getWeeklyChallengeStatus, recordCheckIn } from "@/lib/data/check-ins";
import { getRewardsSummary, getXpEarnedLast12Months } from "@/lib/data/rewards";
import { AREA_STAMP_XP } from "@/lib/rewards-config";
import { signVisitorToken } from "@/lib/visitor-token";

function suffix() {
  return Math.random().toString(36).slice(2, 10);
}

async function makeTraveller() {
  const [user] = await db
    .insert(users)
    .values({ email: `ci-t-${suffix()}@test.local`, passwordHash: "x", name: "Amina", role: "traveller" })
    .returning();
  const [profile] = await db
    .insert(travellerProfiles)
    .values({ userId: user.id, displayName: "Amina", referralCode: `CI${suffix().toUpperCase()}` })
    .returning();
  return { userId: user.id, travellerId: profile.id };
}

async function makeVendor(location: string, trusted = true) {
  const [user] = await db
    .insert(users)
    .values({ email: `ci-v-${suffix()}@test.local`, passwordHash: "x", name: "Vendor", role: "vendor" })
    .returning();
  const [vendor] = await db
    .insert(vendorProfiles)
    .values({
      userId: user.id,
      businessName: `Cafe ${suffix()}`,
      location,
      description: "Test",
      accreditationStatus: trusted ? "trusted" : "pending",
    })
    .returning();
  return { userId: user.id, vendorId: vendor.id };
}

const asVendor = (v: { userId: string }) => (session.current = { userId: v.userId, role: "vendor", email: "v@test.local" });
const asTraveller = (t: { userId: string }) =>
  (session.current = { userId: t.userId, role: "traveller", email: "t@test.local" });

let ntinda: Awaited<ReturnType<typeof makeVendor>>;
let kololo: Awaited<ReturnType<typeof makeVendor>>;

beforeAll(async () => {
  ntinda = await makeVendor("Ntinda, Kampala");
  kololo = await makeVendor("Kololo");
});

describe("verified visits", () => {
  it("logs one visit per member, venue and day, and stamps the neighbourhood", async () => {
    const t = await makeTraveller();
    const token = await signVisitorToken(t.travellerId);
    asVendor(ntinda);

    const first = await checkInVisitorAction(token);
    expect(first).toMatchObject({ ok: true, created: true, newArea: "Ntinda" });
    // "Out and about" (any one visit) is done by the first scan.
    expect(first.ok && first.completed.map((c) => c.title)).toContain("Out and about");

    const again = await checkInVisitorAction(token);
    expect(again).toMatchObject({ ok: true, created: false, completed: [] });
    const rows = await db.select().from(venueCheckIns).where(eq(venueCheckIns.travellerId, t.travellerId));
    expect(rows).toHaveLength(1);
    expect(rows[0].area).toBe("Ntinda");
  });

  it("does not count scans at venues Wano has not verified", async () => {
    const t = await makeTraveller();
    const unverified = await makeVendor("Bugolobi", false);
    asVendor(unverified);
    expect(await checkInVisitorAction(await signVisitorToken(t.travellerId))).toEqual({
      ok: false,
      reason: "not_trusted",
    });
  });

  it("rejects a bad token", async () => {
    asVendor(ntinda);
    expect(await checkInVisitorAction("not-a-token")).toEqual({ ok: false, reason: "invalid" });
  });

  it("completes 'Somewhere new' with two new venues and pays the XP once", async () => {
    const t = await makeTraveller();
    const before = await getXpEarnedLast12Months(t.travellerId);
    await recordCheckIn(t.travellerId, ntinda.vendorId, "qr");
    const second = await recordCheckIn(t.travellerId, kololo.vendorId, "qr");
    expect(second.completed.map((c) => c.title)).toContain("Somewhere new");

    const status = await getWeeklyChallengeStatus(t.travellerId);
    const done = status.filter((s) => s.done);
    const challengeXp = done.reduce((sum, s) => sum + s.challenge.xp, 0);
    const after = await getXpEarnedLast12Months(t.travellerId);
    expect(after - before).toBe(challengeXp + 2 * AREA_STAMP_XP);

    const summary = await getRewardsSummary(t.travellerId, null, null);
    expect(summary.breakdown.find((b) => b.label === "Neighbourhood stamps")?.count).toBe(2);
    expect(summary.breakdown.find((b) => b.label === "Weekly challenges")?.points).toBe(challengeXp);
  });
});

describe("backup visitor code", () => {
  it("gives the member a 6-digit code and reuses it while it is fresh", async () => {
    const t = await makeTraveller();
    asTraveller(t);
    const a = await getVisitorCodeAction();
    const b = await getVisitorCodeAction();
    expect(a.code).toMatch(/^\d{6}$/);
    expect(b.code).toBe(a.code);
  });

  it("opens the visitor page from the code, and the visit is logged as a code check-in", async () => {
    const t = await makeTraveller();
    asTraveller(t);
    const { code } = await getVisitorCodeAction();

    asVendor(kololo);
    const fd = new FormData();
    fd.set("code", `${code.slice(0, 3)} ${code.slice(3)}`);
    const redirected = await lookupVisitorCodeAction(undefined, fd).catch((e: { url?: string }) => e);
    const url = (redirected as { url?: string }).url ?? "";
    expect(url).toMatch(/^\/vendor\/dashboard\/redeem\/visitor\/.+\?via=code$/);

    const token = url.split("/visitor/")[1].split("?")[0];
    expect(await checkInVisitorAction(token, "code")).toMatchObject({ ok: true, created: true });
    const [row] = await db.select().from(venueCheckIns).where(eq(venueCheckIns.travellerId, t.travellerId));
    expect(row.source).toBe("code");
  });

  it("refuses an expired code", async () => {
    const t = await makeTraveller();
    await db.insert(visitorCodes).values({ travellerId: t.travellerId, code: "000017", expiresAt: new Date(Date.now() - 1000) }).onConflictDoNothing();
    asVendor(ntinda);
    const fd = new FormData();
    fd.set("code", "000017");
    expect(await lookupVisitorCodeAction(undefined, fd)).toMatchObject({ error: expect.stringContaining("isn't valid") });
  });

  it("pauses a venue after too many wrong codes", async () => {
    const guesser = await makeVendor("Ntinda");
    asVendor(guesser);
    const fd = new FormData();
    fd.set("code", "abc");
    for (let i = 0; i < CODE_FAILURE_LIMIT; i++) await lookupVisitorCodeAction(undefined, fd);

    const t = await makeTraveller();
    asTraveller(t);
    const { code } = await getVisitorCodeAction();
    asVendor(guesser);
    fd.set("code", code);
    expect(await lookupVisitorCodeAction(undefined, fd)).toMatchObject({ error: expect.stringContaining("Too many") });
  });
});
