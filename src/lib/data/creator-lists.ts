import { randomBytes } from "crypto";
import { and, asc, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { creatorListItems, creatorLists, events, listings, travellerProfiles, users, vendorProfiles } from "@/db/schema";
import { listingPublishConditions } from "@/lib/listing-publish";

export const LIST_MIN_ITEMS = 3;
export const LIST_MAX_ITEMS = 10;
export type CreatorListStatus = "draft" | "in_review" | "published" | "rejected";

export class CreatorListError extends Error {}

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return `${base || "list"}-${randomBytes(3).toString("hex")}`;
}

/** The member's creator status, or null when they aren't in the programme. */
export async function getCreatorProfile(travellerId: string) {
  const [row] = await db
    .select({ id: travellerProfiles.id, name: travellerProfiles.displayName, approvedAt: travellerProfiles.creatorApprovedAt })
    .from(travellerProfiles)
    .where(eq(travellerProfiles.id, travellerId))
    .limit(1);
  return row?.approvedAt ? row : null;
}

async function requireCreator(travellerId: string) {
  const creator = await getCreatorProfile(travellerId);
  if (!creator) throw new CreatorListError("Creator lists are for members of the Wano creator programme.");
  return creator;
}

/** A list the author can still change (draft or sent back). */
async function editableList(authorId: string, listId: string) {
  const [list] = await db
    .select()
    .from(creatorLists)
    .where(and(eq(creatorLists.id, listId), eq(creatorLists.authorId, authorId)))
    .limit(1);
  if (!list) throw new CreatorListError("List not found.");
  if (list.status === "in_review" || list.status === "published") {
    throw new CreatorListError("Move the list back to draft before changing it.");
  }
  return list;
}

function cleanText(value: string, max: number) {
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

export async function createCreatorList(authorId: string, input: { title: string; intro: string; area: string }) {
  await requireCreator(authorId);
  const title = cleanText(input.title, 80);
  if (!title) throw new CreatorListError("Give the list a title.");
  const [list] = await db
    .insert(creatorLists)
    .values({ authorId, slug: slugify(title), title, intro: input.intro.trim().slice(0, 600), area: cleanText(input.area, 60) || null })
    .returning();
  return list;
}

export async function updateCreatorList(
  authorId: string,
  listId: string,
  input: { title: string; intro: string; area: string },
) {
  await editableList(authorId, listId);
  const title = cleanText(input.title, 80);
  if (!title) throw new CreatorListError("Give the list a title.");
  await db
    .update(creatorLists)
    .set({ title, intro: input.intro.trim().slice(0, 600), area: cleanText(input.area, 60) || null })
    .where(eq(creatorLists.id, listId));
}

/** Add a published place or an upcoming event. No repeats, at most
 * LIST_MAX_ITEMS per list. */
export async function addCreatorListItem(
  authorId: string,
  listId: string,
  item: { listingId?: string | null; eventId?: string | null; note?: string },
) {
  await editableList(authorId, listId);
  const listingId = item.listingId || null;
  const eventId = listingId ? null : item.eventId || null;
  if (!listingId && !eventId) throw new CreatorListError("Pick a place or an event.");
  const existing = await db.select().from(creatorListItems).where(eq(creatorListItems.listId, listId));
  if (existing.length >= LIST_MAX_ITEMS) throw new CreatorListError(`A list holds up to ${LIST_MAX_ITEMS} picks.`);
  if (existing.some((i) => (listingId && i.listingId === listingId) || (eventId && i.eventId === eventId))) {
    throw new CreatorListError("That's already on the list.");
  }
  if (listingId) {
    const [ok] = await db
      .select({ id: listings.id })
      .from(listings)
      .innerJoin(vendorProfiles, eq(vendorProfiles.id, listings.vendorProfileId))
      .where(and(eq(listings.id, listingId), ...listingPublishConditions))
      .limit(1);
    if (!ok) throw new CreatorListError("That place isn't live on Wano.");
  } else {
    const [ok] = await db
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.id, eventId!), eq(events.active, true)))
      .limit(1);
    if (!ok) throw new CreatorListError("That event isn't on Wano.");
  }
  const position = existing.reduce((max, i) => Math.max(max, i.position + 1), 0);
  await db.insert(creatorListItems).values({
    listId,
    listingId,
    eventId,
    note: item.note ? cleanText(item.note, 200) || null : null,
    position,
  });
}

export async function removeCreatorListItem(authorId: string, listId: string, itemId: string) {
  await editableList(authorId, listId);
  await db.delete(creatorListItems).where(and(eq(creatorListItems.id, itemId), eq(creatorListItems.listId, listId)));
}

/** Send to the Wano team. Needs a title, an intro and LIST_MIN_ITEMS picks. */
export async function submitCreatorList(authorId: string, listId: string) {
  await requireCreator(authorId);
  const list = await editableList(authorId, listId);
  if (!list.intro.trim()) throw new CreatorListError("Add a short intro so people know why these picks.");
  const [{ total }] = await db.select({ total: count() }).from(creatorListItems).where(eq(creatorListItems.listId, listId));
  if (total < LIST_MIN_ITEMS) throw new CreatorListError(`Add at least ${LIST_MIN_ITEMS} picks before sending it.`);
  await db
    .update(creatorLists)
    .set({ status: "in_review", submittedAt: new Date(), reviewNote: null })
    .where(eq(creatorLists.id, listId));
}

/** Pull a list back to draft to change it. A published list goes offline
 * until it's reviewed again. */
export async function withdrawCreatorList(authorId: string, listId: string) {
  await db
    .update(creatorLists)
    .set({ status: "draft" })
    .where(and(eq(creatorLists.id, listId), eq(creatorLists.authorId, authorId)));
}

/** Admin decision on a list in review. */
export async function reviewCreatorList(listId: string, decision: "publish" | "reject", note?: string) {
  const [list] = await db.select().from(creatorLists).where(eq(creatorLists.id, listId)).limit(1);
  if (!list) throw new CreatorListError("List not found.");
  if (decision === "publish") {
    await db
      .update(creatorLists)
      .set({ status: "published", publishedAt: list.publishedAt ?? new Date(), reviewNote: null })
      .where(eq(creatorLists.id, listId));
  } else {
    const reason = cleanText(note ?? "", 300);
    if (!reason) throw new CreatorListError("Say what to change, so the creator can fix it.");
    await db.update(creatorLists).set({ status: "rejected", reviewNote: reason }).where(eq(creatorLists.id, listId));
  }
  return list;
}

export async function unpublishCreatorList(listId: string) {
  await db.update(creatorLists).set({ status: "rejected", reviewNote: "Taken down by the Wano team." }).where(eq(creatorLists.id, listId));
}

export async function getMyCreatorLists(authorId: string) {
  const rows = await db
    .select({ list: creatorLists, items: sql<number>`(select count(*)::int from creator_list_items i where i.list_id = ${creatorLists.id})` })
    .from(creatorLists)
    .where(eq(creatorLists.authorId, authorId))
    .orderBy(desc(creatorLists.createdAt));
  return rows.map((r) => ({ ...r.list, itemCount: r.items }));
}

/** One list with its picks in order. Picks whose place went offline are
 * left out of public views. */
export async function getCreatorList(where: { id: string } | { slug: string }) {
  const [row] = await db
    .select({ list: creatorLists, authorName: travellerProfiles.displayName, authorUsername: users.username, creatorSince: travellerProfiles.creatorApprovedAt })
    .from(creatorLists)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, creatorLists.authorId))
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where("id" in where ? eq(creatorLists.id, where.id) : eq(creatorLists.slug, where.slug))
    .limit(1);
  if (!row) return null;
  const items = await db
    .select({
      item: creatorListItems,
      listingTitle: listings.title,
      listingLive: sql<boolean>`${listings.active} and ${listings.isPublished}`,
      vendorName: vendorProfiles.businessName,
      vendorLocation: vendorProfiles.location,
      eventTitle: events.title,
      eventStartAt: events.startAt,
      eventLocation: events.location,
      eventActive: events.active,
    })
    .from(creatorListItems)
    .leftJoin(listings, eq(listings.id, creatorListItems.listingId))
    .leftJoin(vendorProfiles, eq(vendorProfiles.id, listings.vendorProfileId))
    .leftJoin(events, eq(events.id, creatorListItems.eventId))
    .where(eq(creatorListItems.listId, row.list.id))
    .orderBy(asc(creatorListItems.position));
  return {
    ...row.list,
    author: { name: row.authorName, username: row.authorUsername, isCreator: Boolean(row.creatorSince) },
    items: items.map((r) => ({
      id: r.item.id,
      note: r.item.note,
      kind: r.item.listingId ? ("listing" as const) : ("event" as const),
      href: r.item.listingId ? `/explore/${r.item.listingId}` : `/events/${r.item.eventId}`,
      title: r.listingTitle ?? r.eventTitle ?? "Removed",
      subtitle: r.item.listingId ? [r.vendorName, r.vendorLocation].filter(Boolean).join(" · ") : r.eventLocation ?? "",
      startsAt: r.eventStartAt,
      live: r.item.listingId ? Boolean(r.listingLive) : Boolean(r.eventActive),
    })),
  };
}
export type CreatorListView = NonNullable<Awaited<ReturnType<typeof getCreatorList>>>;

/** Published lists, newest first, optionally by one author. */
export async function getPublishedCreatorLists(opts: { authorId?: string; limit?: number } = {}) {
  const rows = await db
    .select({
      list: creatorLists,
      authorName: travellerProfiles.displayName,
      items: sql<number>`(select count(*)::int from creator_list_items i where i.list_id = ${creatorLists.id})`,
    })
    .from(creatorLists)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, creatorLists.authorId))
    .where(
      and(
        eq(creatorLists.status, "published"),
        isNotNull(travellerProfiles.creatorApprovedAt),
        opts.authorId ? eq(creatorLists.authorId, opts.authorId) : undefined,
      ),
    )
    .orderBy(desc(creatorLists.publishedAt))
    .limit(opts.limit ?? 50);
  return rows.map((r) => ({ ...r.list, authorName: r.authorName, itemCount: r.items }));
}

/** Admin queue: lists waiting for review first, then everything else. */
export async function getCreatorListsForAdmin() {
  const rows = await db
    .select({
      list: creatorLists,
      authorName: travellerProfiles.displayName,
      items: sql<number>`(select count(*)::int from creator_list_items i where i.list_id = ${creatorLists.id})`,
    })
    .from(creatorLists)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, creatorLists.authorId))
    .orderBy(sql`${creatorLists.status} = 'in_review' desc`, desc(creatorLists.submittedAt), desc(creatorLists.createdAt));
  return rows.map((r) => ({ ...r.list, authorName: r.authorName, itemCount: r.items }));
}

/** Everyone in the creator programme, for the admin page. */
export async function getCreators() {
  return db
    .select({ id: travellerProfiles.id, name: travellerProfiles.displayName, since: travellerProfiles.creatorApprovedAt })
    .from(travellerProfiles)
    .where(isNotNull(travellerProfiles.creatorApprovedAt))
    .orderBy(asc(travellerProfiles.displayName));
}

/** Pickers for the list editor: live places and upcoming events. */
export async function getCreatorListPickOptions() {
  const [places, upcoming] = await Promise.all([
    db
      .select({ id: listings.id, title: listings.title, vendorName: vendorProfiles.businessName })
      .from(listings)
      .innerJoin(vendorProfiles, eq(vendorProfiles.id, listings.vendorProfileId))
      .where(and(...listingPublishConditions))
      .orderBy(listings.title),
    db
      .select({ id: events.id, title: events.title, startAt: events.startAt })
      .from(events)
      .where(and(eq(events.active, true), sql`${events.startAt} >= now()`))
      .orderBy(events.startAt)
      .limit(200),
  ]);
  return { places, upcoming };
}

export function isCreatorListStatus(value: string): value is CreatorListStatus {
  return ["draft", "in_review", "published", "rejected"].includes(value);
}
