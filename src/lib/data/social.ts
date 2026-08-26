import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  events,
  follows,
  listings,
  postComments,
  postLikes,
  posts,
  travellerProfiles,
  users,
} from "@/db/schema";

export async function getFeedPosts(limit = 30) {
  const rows = await db
    .select({
      post: posts,
      author: travellerProfiles,
      authorUser: users,
      listing: listings,
      event: events,
    })
    .from(posts)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, posts.travellerId))
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .leftJoin(listings, eq(listings.id, posts.listingId))
    .leftJoin(events, eq(events.id, posts.eventId))
    .orderBy(desc(posts.createdAt))
    .limit(limit);
  return rows;
}

export async function getPostsByTraveller(travellerId: string) {
  return db
    .select({ post: posts, listing: listings, event: events })
    .from(posts)
    .leftJoin(listings, eq(listings.id, posts.listingId))
    .leftJoin(events, eq(events.id, posts.eventId))
    .where(eq(posts.travellerId, travellerId))
    .orderBy(desc(posts.createdAt));
}

export async function getEngagementCounts(postIds: string[]) {
  const likeMap = new Map<string, number>();
  const commentMap = new Map<string, number>();
  if (postIds.length === 0) return { likeMap, commentMap };

  const likeRows = await db
    .select({ postId: postLikes.postId, total: count() })
    .from(postLikes)
    .where(inArray(postLikes.postId, postIds))
    .groupBy(postLikes.postId);
  for (const row of likeRows) likeMap.set(row.postId, row.total);

  const commentRows = await db
    .select({ postId: postComments.postId, total: count() })
    .from(postComments)
    .where(inArray(postComments.postId, postIds))
    .groupBy(postComments.postId);
  for (const row of commentRows) commentMap.set(row.postId, row.total);

  return { likeMap, commentMap };
}

export async function getLikedPostIds(travellerId: string, postIds: string[]) {
  if (postIds.length === 0) return new Set<string>();
  const rows = await db
    .select({ postId: postLikes.postId })
    .from(postLikes)
    .where(and(eq(postLikes.travellerId, travellerId), inArray(postLikes.postId, postIds)));
  return new Set(rows.map((r) => r.postId));
}

export async function getCommentsForPost(postId: string) {
  return db
    .select({ comment: postComments, author: travellerProfiles })
    .from(postComments)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, postComments.travellerId))
    .where(eq(postComments.postId, postId))
    .orderBy(postComments.createdAt);
}

export async function getFollowCounts(travellerId: string) {
  const [[followers], [following]] = await Promise.all([
    db.select({ total: count() }).from(follows).where(eq(follows.followingId, travellerId)),
    db.select({ total: count() }).from(follows).where(eq(follows.followerId, travellerId)),
  ]);
  return { followers: followers?.total ?? 0, following: following?.total ?? 0 };
}

export async function isFollowing(followerId: string, followingId: string) {
  const [row] = await db
    .select()
    .from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
    .limit(1);
  return row != null;
}

export async function getTravellerByUsername(username: string) {
  const [row] = await db
    .select({ traveller: travellerProfiles, user: users })
    .from(users)
    .innerJoin(travellerProfiles, eq(travellerProfiles.userId, users.id))
    .where(eq(users.username, username))
    .limit(1);
  return row ?? null;
}

export async function getSuggestedPeople(excludeTravellerId: string, limit = 5) {
  const rows = await db
    .select({ traveller: travellerProfiles, user: users })
    .from(travellerProfiles)
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .limit(limit + 1);
  return rows.filter((r) => r.traveller.id !== excludeTravellerId).slice(0, limit);
}
