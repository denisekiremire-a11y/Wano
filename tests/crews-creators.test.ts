import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "../src/db";
import { crewMembers, crews, events, listings, travellerProfiles, users, vendorProfiles } from "../src/db/schema";

// Piece 8: crews (shared Passport) and creator lists.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { recordCheckIn } from "@/lib/data/check-ins";
import {
  createCrew,
  CREW_MAX,
  CrewError,
  getCrewInvite,
  getCrewPassport,
  getMyCrew,
  joinCrew,
  leaveCrew,
  removeCrewMember,
} from "@/lib/data/crews";
import {
  addCreatorListItem,
  createCreatorList,
  CreatorListError,
  getCreatorList,
  getPublishedCreatorLists,
  reviewCreatorList,
  submitCreatorList,
  updateCreatorList,
  withdrawCreatorList,
} from "@/lib/data/creator-lists";

function suffix() {
  return Math.random().toString(36).slice(2, 10);
}
async function makeTraveller(name: string, creator = false) {
  const [user] = await db
    .insert(users)
    .values({ email: `cc-${suffix()}@test.local`, passwordHash: "x", name, role: "traveller" })
    .returning();
  const [profile] = await db
    .insert(travellerProfiles)
    .values({
      userId: user.id,
      displayName: name,
      referralCode: `CC${suffix().toUpperCase()}`,
      creatorApprovedAt: creator ? new Date() : null,
    })
    .returning();
  return profile.id;
}
async function makeVenue(location = "Kololo") {
  const [user] = await db
    .insert(users)
    .values({ email: `cc-v-${suffix()}@test.local`, passwordHash: "x", name: "V", role: "vendor" })
    .returning();
  const [vendor] = await db
    .insert(vendorProfiles)
    .values({ userId: user.id, businessName: `Venue ${suffix()}`, location, description: "x", accreditationStatus: "trusted" })
    .returning();
  const [listing] = await db
    .insert(listings)
    .values({
      vendorProfileId: vendor.id,
      title: `Spot ${suffix()}`,
      description: "A good spot",
      type: "experience",
      priceMinor: 20_000,
      active: true,
      isPublished: true,
    })
    .returning();
  return { vendorId: vendor.id, listingId: listing.id };
}

describe("crews", () => {
  it("one crew per person, owner hands over on leaving, last one out closes it", async () => {
    const [a, b, c] = await Promise.all([makeTraveller("Amina"), makeTraveller("Brian"), makeTraveller("Cathy")]);
    const crew = await createCrew(a, "  Kololo   Fridays ");
    expect(crew.name).toBe("Kololo Fridays");
    await expect(createCrew(a, "Another")).rejects.toBeInstanceOf(CrewError);

    await joinCrew(b, crew.inviteToken);
    await joinCrew(b, crew.inviteToken); // opening the link twice is fine
    const other = await createCrew(c, "Ntinda");
    await expect(joinCrew(c, crew.inviteToken)).rejects.toThrow(/already in a crew/);

    expect((await getMyCrew(b))?.members.map((m) => [m.name, m.role])).toEqual([
      ["Amina", "owner"],
      ["Brian", "member"],
    ]);
    await expect(removeCrewMember(b, a)).rejects.toThrow(/Only the crew owner/);

    await leaveCrew(a);
    expect((await getMyCrew(b))?.members).toEqual([expect.objectContaining({ name: "Brian", role: "owner" })]);
    await leaveCrew(b);
    expect(await db.select().from(crews).where(eq(crews.id, crew.id))).toHaveLength(0);
    expect(await getMyCrew(c)).toMatchObject({ id: other.id });
  });

  it("stops at the size limit", async () => {
    const owner = await makeTraveller("Owner");
    const crew = await createCrew(owner, "Big crew");
    const others = await Promise.all(Array.from({ length: CREW_MAX }, (_, i) => makeTraveller(`M${i}`)));
    const results = await Promise.allSettled(others.map((id) => joinCrew(id, crew.inviteToken)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(CREW_MAX - 1);
    expect(await db.select().from(crewMembers).where(eq(crewMembers.crewId, crew.id))).toHaveLength(CREW_MAX);
    expect((await getCrewInvite(crew.inviteToken))?.full).toBe(true);
  });

  it("the shared Passport adds up the crew without adding XP", async () => {
    const [a, b] = await Promise.all([makeTraveller("Ann"), makeTraveller("Ben")]);
    const crew = await createCrew(a, "Shared");
    await joinCrew(b, crew.inviteToken);
    const kololo = await makeVenue("Kololo");
    const ntinda = await makeVenue("Ntinda Complex");
    const now = new Date();
    await recordCheckIn(a, kololo.vendorId, "qr", now);
    await recordCheckIn(b, ntinda.vendorId, "qr", now);

    const members = (await getMyCrew(a))!.members;
    const passport = await getCrewPassport(members, now);
    expect(passport.goersThisWeek).toBe(2);
    expect(passport.visitsThisWeek).toBe(2);
    expect(passport.totalXp).toBe(passport.members.reduce((s, m) => s + m.xp, 0));
    expect(passport.areas.find((x) => x.area === "Kololo")?.by).toEqual(["Ann"]);
    expect(passport.areas.find((x) => x.area === "Ntinda")?.by).toEqual(["Ben"]);
    expect(passport.challenges.length).toBe(3);
  });
});

describe("creator lists", () => {
  it("only creators can make lists, and a list needs an intro and 3 picks to send", async () => {
    const member = await makeTraveller("Not a creator");
    await expect(createCreatorList(member, { title: "Mine", intro: "", area: "" })).rejects.toBeInstanceOf(CreatorListError);

    const creator = await makeTraveller("Creator", true);
    const list = await createCreatorList(creator, { title: "Rooftops for a Friday", intro: "", area: "Kololo" });
    expect(list.slug).toMatch(/^rooftops-for-a-friday-[0-9a-f]{6}$/);
    await expect(submitCreatorList(creator, list.id)).rejects.toThrow(/intro/);
    await updateCreatorList(creator, list.id, { title: "Rooftops for a Friday", intro: "Where I go.", area: "Kololo" });
    await expect(submitCreatorList(creator, list.id)).rejects.toThrow(/at least 3/);

    const venues = await Promise.all([makeVenue(), makeVenue(), makeVenue()]);
    for (const v of venues) await addCreatorListItem(creator, list.id, { listingId: v.listingId, note: "Go early" });
    await expect(addCreatorListItem(creator, list.id, { listingId: venues[0].listingId })).rejects.toThrow(/already/);
    const [event] = await db
      .insert(events)
      .values({ title: `Gig ${suffix()}`, description: "x", category: "music", location: "Kololo", startAt: new Date(Date.now() + 86_400_000) })
      .returning();
    await addCreatorListItem(creator, list.id, { eventId: event.id });

    // Someone else can't touch it.
    const stranger = await makeTraveller("Stranger", true);
    await expect(addCreatorListItem(stranger, list.id, { listingId: venues[0].listingId })).rejects.toThrow(/not found/);

    await submitCreatorList(creator, list.id);
    await expect(updateCreatorList(creator, list.id, { title: "x", intro: "y", area: "" })).rejects.toThrow(/back to draft/);
    expect((await getPublishedCreatorLists()).some((l) => l.id === list.id)).toBe(false);

    await expect(reviewCreatorList(list.id, "reject", " ")).rejects.toThrow(/what to change/);
    await reviewCreatorList(list.id, "reject", "Add a photo-worthy pick");
    expect((await getCreatorList({ id: list.id }))?.reviewNote).toBe("Add a photo-worthy pick");
    await submitCreatorList(creator, list.id);
    await reviewCreatorList(list.id, "publish");

    const live = await getCreatorList({ slug: list.slug });
    expect(live?.status).toBe("published");
    expect(live?.author).toMatchObject({ name: "Creator", isCreator: true });
    expect(live?.items.map((i) => i.kind)).toEqual(["listing", "listing", "listing", "event"]);
    expect((await getPublishedCreatorLists({ authorId: creator })).map((l) => l.id)).toEqual([list.id]);

    // Editing a live list takes it offline until it's checked again.
    await withdrawCreatorList(creator, list.id);
    expect((await getPublishedCreatorLists({ authorId: creator }))).toHaveLength(0);
  });

  it("hides lists when the author leaves the creator programme", async () => {
    const creator = await makeTraveller("Former creator", true);
    const list = await createCreatorList(creator, { title: "Old list", intro: "x", area: "" });
    const venues = await Promise.all([makeVenue(), makeVenue(), makeVenue()]);
    for (const v of venues) await addCreatorListItem(creator, list.id, { listingId: v.listingId });
    await submitCreatorList(creator, list.id);
    await reviewCreatorList(list.id, "publish");
    await db.update(travellerProfiles).set({ creatorApprovedAt: null }).where(eq(travellerProfiles.id, creator));
    expect((await getPublishedCreatorLists()).some((l) => l.id === list.id)).toBe(false);
  });

  it("won't add places that aren't live", async () => {
    const creator = await makeTraveller("Picky", true);
    const list = await createCreatorList(creator, { title: "Hidden gems", intro: "x", area: "" });
    const v = await makeVenue();
    await db.update(listings).set({ isPublished: false }).where(eq(listings.id, v.listingId));
    await expect(addCreatorListItem(creator, list.id, { listingId: v.listingId })).rejects.toThrow(/isn't live/);
  });
});
