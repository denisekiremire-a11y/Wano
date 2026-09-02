import { and, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  clubs,
  feedItems,
  follows,
  interests,
  clubMemberships,
  postImages,
  posts,
  travellerInterests,
  travellerProfiles,
  users,
} from "@/db/schema";
import {
  NEUTRAL_AFFINITY,
  scoreFeedItem,
  type FeedAffinityContext,
  type ScorableFeedItem,
} from "@/lib/feed-ranking";
import { getCommentsForPost, getEngagementCounts, getLikedPostIds } from "@/lib/data/social";
import { getBlockedTravellerIds } from "@/lib/data/moderation";
import { resolvePostContexts, type PostContextCard, type PostContextType } from "@/lib/data/post-context";

const FEED_WINDOW_DAYS = 30;

export async function getFeedAffinityContext(travellerId: string): Promise<FeedAffinityContext> {
  const [profile, followingRows, clubRows, interestRows] = await Promise.all([
    db.select({ city: travellerProfiles.city }).from(travellerProfiles).where(eq(travellerProfiles.id, travellerId)).limit(1),
    db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, travellerId)),
    db.select({ id: clubMemberships.clubId }).from(clubMemberships).where(eq(clubMemberships.travellerId, travellerId)),
    db
      .select({ key: interests.key })
      .from(travellerInterests)
      .innerJoin(interests, eq(interests.id, travellerInterests.interestId))
      .where(eq(travellerInterests.travellerId, travellerId)),
  ]);

  return {
    city: profile[0]?.city ?? null,
    followingTravellerIds: new Set(followingRows.map((r) => r.id)),
    clubIds: new Set(clubRows.map((r) => r.id)),
    interestKeys: new Set(interestRows.map((r) => r.key)),
  };
}

export type FeedEntry =
  | { kind: "generated"; id: string; type: string; payload: Record<string, unknown>; createdAt: Date }
  | {
      kind: "user_post";
      id: string;
      createdAt: Date;
      post: { id: string; content: string; imageUrl: string | null; createdAt: Date };
      imageIds: string[];
      authorTravellerId: string;
      authorName: string;
      authorUsername: string | null;
      likeCount: number;
      commentCount: number;
      liked: boolean;
      canInteract: boolean;
      comments: Awaited<ReturnType<typeof getCommentsForPost>>;
      context: PostContextCard | null;
    };

/** The public Social feed — generated items ranked alongside live user
 * posts. `viewerTravellerId` is null for a signed-out visitor, who gets the
 * same feed with affinity neutral (the feed is public and indexable). */
export async function getRankedFeed(viewerTravellerId: string | null, limit = 30): Promise<FeedEntry[]> {
  const affinity = viewerTravellerId ? await getFeedAffinityContext(viewerTravellerId) : NEUTRAL_AFFINITY;
  const blockedIds = viewerTravellerId ? await getBlockedTravellerIds(viewerTravellerId) : new Set<string>();

  const since = new Date(Date.now() - FEED_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      item: feedItems,
      subjectShowsActivity: travellerProfiles.showActivityInFeed,
      clubInterestKey: interests.key,
    })
    .from(feedItems)
    .leftJoin(travellerProfiles, eq(travellerProfiles.id, feedItems.subjectTravellerId))
    .leftJoin(clubs, eq(clubs.id, feedItems.clubId))
    .leftJoin(interests, eq(interests.id, clubs.interestId))
    .where(gte(feedItems.createdAt, since))
    .orderBy(desc(feedItems.createdAt))
    .limit(300);

  // The privacy toggle only suppresses review_posted — the one type in this
  // table that's unambiguously "this specific traveller's activity" rather
  // than a platform- or event-level aggregate. Blocks (in either direction)
  // suppress any item authored by the blocked party, regardless of type.
  const visible = rows.filter((r) => {
    if (r.item.type === "review_posted" && r.subjectShowsActivity === false) return false;
    if (r.item.subjectTravellerId && blockedIds.has(r.item.subjectTravellerId)) return false;
    return true;
  });

  const scored = visible
    .map((r) => {
      const scorable: ScorableFeedItem = {
        type: r.item.type,
        createdAt: r.item.createdAt,
        city: r.item.city,
        subjectTravellerId: r.item.subjectTravellerId,
        clubId: r.item.clubId,
        interestKey: r.clubInterestKey,
      };
      return { row: r.item, score: scoreFeedItem(scorable, affinity) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const postIds = scored
    .filter((s) => s.row.type === "user_post")
    .map((s) => s.row.postId)
    .filter((id): id is string => Boolean(id));

  let livePosts = new Map<
    string,
    {
      post: typeof posts.$inferSelect;
      authorTravellerId: string;
      authorName: string;
      authorUsername: string | null;
    }
  >();
  let likeMap = new Map<string, number>();
  let commentMap = new Map<string, number>();
  let likedIds = new Set<string>();
  let commentsMap = new Map<string, Awaited<ReturnType<typeof getCommentsForPost>>>();
  let imageIdsMap = new Map<string, string[]>();

  if (postIds.length > 0) {
    const rows = await db
      .select({ post: posts, author: travellerProfiles, authorUser: users })
      .from(posts)
      .innerJoin(travellerProfiles, eq(travellerProfiles.id, posts.travellerId))
      .innerJoin(users, eq(users.id, travellerProfiles.userId))
      // Only ever hydrate visible, public posts — hidden/removed/
      // pending_review posts and posts addressed to a club (never the
      // global feed) simply drop out here (their feed_items row can still
      // exist, it just resolves to nothing to render).
      .where(and(inArray(posts.id, postIds), eq(posts.status, "visible"), isNull(posts.audienceClubId)));
    livePosts = new Map(
      rows.map((r) => [
        r.post.id,
        {
          post: r.post,
          authorTravellerId: r.author.id,
          authorName: r.author.displayName,
          authorUsername: r.authorUser.username,
        },
      ]),
    );

    const engagement = await getEngagementCounts(postIds);
    likeMap = engagement.likeMap;
    commentMap = engagement.commentMap;
    likedIds = viewerTravellerId ? await getLikedPostIds(viewerTravellerId, postIds) : new Set();
    const commentsByPost = await Promise.all(
      postIds.map((id) => getCommentsForPost(id).then((c) => [id, c] as const)),
    );
    commentsMap = new Map(commentsByPost);

    const imageRows = await db
      .select({ id: postImages.id, postId: postImages.postId })
      .from(postImages)
      .where(inArray(postImages.postId, postIds))
      .orderBy(postImages.sortOrder);
    imageIdsMap = new Map();
    for (const row of imageRows) {
      const list = imageIdsMap.get(row.postId) ?? [];
      list.push(row.id);
      imageIdsMap.set(row.postId, list);
    }
  }

  const contextRefs = [...livePosts.values()]
    .filter((live) => live.post.contextType && live.post.contextId)
    .map((live) => ({ type: live.post.contextType as PostContextType, id: live.post.contextId as string }));
  const contextMap = await resolvePostContexts(contextRefs);

  const entries: FeedEntry[] = [];
  for (const { row } of scored) {
    if (row.type === "user_post") {
      const live = row.postId ? livePosts.get(row.postId) : undefined;
      if (!live) continue; // post was deleted after the feed item was generated (postId FK will clean this up via cascade in practice)
      entries.push({
        kind: "user_post",
        id: row.id,
        createdAt: row.createdAt,
        post: live.post,
        imageIds: imageIdsMap.get(live.post.id) ?? [],
        authorTravellerId: live.authorTravellerId,
        authorName: live.authorName,
        authorUsername: live.authorUsername,
        likeCount: likeMap.get(live.post.id) ?? 0,
        commentCount: commentMap.get(live.post.id) ?? 0,
        liked: likedIds.has(live.post.id),
        canInteract: Boolean(viewerTravellerId),
        comments: commentsMap.get(live.post.id) ?? [],
        context:
          live.post.contextType && live.post.contextId
            ? (contextMap.get(`${live.post.contextType}:${live.post.contextId}`) ?? null)
            : null,
      });
    } else {
      entries.push({
        kind: "generated",
        id: row.id,
        type: row.type,
        payload: row.payload,
        createdAt: row.createdAt,
      });
    }
  }
  return entries;
}
