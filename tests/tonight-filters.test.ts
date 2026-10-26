import { describe, expect, it, vi } from "vitest";
import { db } from "../src/db";
import { events, travellerProfiles, users, vendorProfiles } from "../src/db/schema";

// Piece 7: home filters, the partner "tonight" line and weekly goers.
type FakeSession = { userId: string; role: "vendor"; email: string };
const session = vi.hoisted(() => ({ current: { userId: "", role: "vendor", email: "" } as FakeSession }));
vi.mock("@/lib/auth", () => ({ requireRole: vi.fn(async () => session.current) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { postTonightUpdateAction } from "@/lib/actions/tonight-update-actions";
import { getWeeklyGoers, recordCheckIn } from "@/lib/data/check-ins";
import { getTonightFeed } from "@/lib/data/tonight";
import { getMyTonightUpdate, getTonightUpdates } from "@/lib/data/tonight-updates";
import { parseHomeFilter } from "@/lib/tonight";

function suffix() {
  return Math.random().toString(36).slice(2, 10);
}
async function makeVendor(trusted = true) {
  const [user] = await db
    .insert(users)
    .values({ email: `tf-v-${suffix()}@test.local`, passwordHash: "x", name: "V", role: "vendor" })
    .returning();
  const [vendor] = await db
    .insert(vendorProfiles)
    .values({
      userId: user.id,
      businessName: `Venue ${suffix()}`,
      location: "Kololo",
      description: "x",
      accreditationStatus: trusted ? "trusted" : "pending",
    })
    .returning();
  return { userId: user.id, id: vendor.id };
}
const post = async (v: { userId: string }, text: string) => {
  session.current = { userId: v.userId, role: "vendor", email: "v@test.local" };
  const fd = new FormData();
  fd.set("text", text);
  return postTonightUpdateAction(undefined, fd);
};

describe("home filters", () => {
  it("reads only the two known filters", () => {
    expect(parseHomeFilter("cheap")).toBe("cheap");
    expect(parseHomeFilter("indoors")).toBe("indoors");
    expect(parseHomeFilter("x")).toBeNull();
    expect(parseHomeFilter(undefined)).toBeNull();
  });

  it("shows only tagged events under a filter, without perks or the journey", async () => {
    // A far-future Saturday evening keeps this away from seeded events.
    const now = new Date("2031-03-07T09:00:00Z");
    const at = new Date("2031-03-07T17:00:00Z");
    const tag = suffix();
    const base = { description: "x", category: "music", location: "Kololo", startAt: at };
    await db.insert(events).values([
      { ...base, title: `Free jazz ${tag}`, priceFromMinor: 0, indoors: false },
      { ...base, title: `Cheap quiz ${tag}`, priceFromMinor: 20_000, indoors: true },
      { ...base, title: `Gala ${tag}`, priceFromMinor: 150_000, indoors: true },
      { ...base, title: `Untagged ${tag}` },
    ]);
    const titles = async (f: "cheap" | "indoors" | null) =>
      (await getTonightFeed({ slug: "j", name: "Journey", tagline: "t" }, now, f))
        .filter((c) => c.title.endsWith(tag) || c.kind !== "today")
        .map((c) => c.title.replace(` ${tag}`, ""));

    expect((await titles("cheap")).sort()).toEqual(["Cheap quiz", "Free jazz"]);
    expect((await titles("indoors")).sort()).toEqual(["Cheap quiz", "Gala"]);
    const all = await titles(null);
    expect(all).toEqual(expect.arrayContaining(["Free jazz", "Cheap quiz", "Gala", "Untagged"]));
  });
});

describe("partner tonight line", () => {
  it("posts, replaces and clears today's line", async () => {
    const v = await makeVendor();
    expect(await post(v, "Live band from 8")).toEqual({ ok: true });
    expect(await post(v, "Live band from 8, 2-for-1 till 9")).toEqual({ ok: true });
    expect((await getMyTonightUpdate(v.id))?.text).toBe("Live band from 8, 2-for-1 till 9");
    expect((await getTonightUpdates(new Date(), 200)).filter((u) => u.text.includes("2-for-1 till 9"))).toHaveLength(1);
    await post(v, "  ");
    expect(await getMyTonightUpdate(v.id)).toBeNull();
  });

  it("refuses long lines and hides unverified venues", async () => {
    const v = await makeVendor(false);
    expect(await post(v, "x".repeat(141))).toMatchObject({ error: expect.stringContaining("140") });
    await post(v, `Unverified special ${suffix()}`);
    const shown = await getTonightUpdates(new Date(), 200);
    expect(shown.some((u) => u.text.startsWith("Unverified special"))).toBe(false);
  });
});

describe("weekly goers", () => {
  it("counts each member once per week", async () => {
    const v = await makeVendor();
    const v2 = await makeVendor();
    const [u] = await db
      .insert(users)
      .values({ email: `tf-t-${suffix()}@test.local`, passwordHash: "x", name: "T", role: "traveller" })
      .returning();
    const [t] = await db
      .insert(travellerProfiles)
      .values({ userId: u.id, displayName: "T", referralCode: `TF${suffix().toUpperCase()}` })
      .returning();
    const now = new Date("2032-06-16T10:00:00Z"); // a Wednesday
    const before = await getWeeklyGoers(2, now);
    await recordCheckIn(t.id, v.id, "qr", now);
    await recordCheckIn(t.id, v2.id, "qr", now);
    await recordCheckIn(t.id, v.id, "qr", new Date("2032-06-09T10:00:00Z"));
    const after = await getWeeklyGoers(2, now);
    expect(after[0].weekStart).toBe("2032-06-14");
    expect(after[0].goers - before[0].goers).toBe(1);
    expect(after[1].goers - before[1].goers).toBe(1);
  });
});
