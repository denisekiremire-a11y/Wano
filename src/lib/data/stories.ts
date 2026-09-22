import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { storyViews, stories, travellerProfiles, users } from "@/db/schema";

export type StoryItem = { id: string; createdAt: Date; caption: string | null };
export type StoryGroup = {
  travellerId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  stories: StoryItem[];
  hasUnseen: boolean;
};

/** Every traveller (other than the viewer) with at least one active story,
 * each with their stories oldest-first (playback order) and whether the
 * viewer has an unseen one from them. Unseen authors sort first, then by
 * most recent story. */
export async function getActiveStoryGroups(viewerTravellerId: string | null): Promise<StoryGroup[]> {
  const rows = await db
    .select({
      story: stories,
      travellerId: travellerProfiles.id,
      displayName: travellerProfiles.displayName,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(stories)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, stories.travellerId))
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(gt(stories.expiresAt, new Date()))
    .orderBy(stories.createdAt);

  const storyIds = rows.map((r) => r.story.id);
  const seenIds = viewerTravellerId
    ? new Set(
        (
          await db
            .select({ storyId: storyViews.storyId })
            .from(storyViews)
            .where(
              and(eq(storyViews.viewerTravellerId, viewerTravellerId), inArray(storyViews.storyId, storyIds)),
            )
        ).map((r) => r.storyId),
      )
    : new Set<string>();

  const groups = new Map<string, StoryGroup>();
  for (const r of rows) {
    if (r.travellerId === viewerTravellerId) continue; // "your story" is shown separately
    const existing = groups.get(r.travellerId);
    const item: StoryItem = { id: r.story.id, createdAt: r.story.createdAt, caption: r.story.caption };
    if (existing) {
      existing.stories.push(item);
      if (!seenIds.has(r.story.id)) existing.hasUnseen = true;
    } else {
      groups.set(r.travellerId, {
        travellerId: r.travellerId,
        displayName: r.displayName,
        username: r.username,
        avatarUrl: r.avatarUrl,
        stories: [item],
        hasUnseen: !seenIds.has(r.story.id),
      });
    }
  }

  return [...groups.values()].sort((a, b) => {
    if (a.hasUnseen !== b.hasUnseen) return a.hasUnseen ? -1 : 1;
    const aLatest = a.stories[a.stories.length - 1].createdAt.getTime();
    const bLatest = b.stories[b.stories.length - 1].createdAt.getTime();
    return bLatest - aLatest;
  });
}

/** The viewer's own active stories, oldest-first, for the "Your story" circle. */
export async function getMyActiveStories(travellerId: string): Promise<StoryItem[]> {
  const rows = await db
    .select({ id: stories.id, createdAt: stories.createdAt, caption: stories.caption })
    .from(stories)
    .where(and(eq(stories.travellerId, travellerId), gt(stories.expiresAt, new Date())))
    .orderBy(stories.createdAt);
  return rows;
}

export async function recordStoryView(storyId: string, viewerTravellerId: string) {
  await db
    .insert(storyViews)
    .values({ storyId, viewerTravellerId })
    .onConflictDoNothing({ target: [storyViews.storyId, storyViews.viewerTravellerId] });
}

export async function countStoriesInLast24h(travellerId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(stories)
    .where(and(eq(stories.travellerId, travellerId), gt(stories.createdAt, since)));
  return row?.total ?? 0;
}

export async function getStoryOwner(storyId: string) {
  const [row] = await db
    .select({ travellerId: stories.travellerId })
    .from(stories)
    .where(eq(stories.id, storyId))
    .limit(1);
  return row?.travellerId ?? null;
}

/** avatarUrl lives on `users`, not travellerProfiles — small lookup for
 * the "Your story" circle. */
export async function getUserAvatarUrl(userId: string) {
  const [row] = await db.select({ avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, userId)).limit(1);
  return row?.avatarUrl ?? null;
}
