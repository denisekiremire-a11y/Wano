import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  clubMemberships,
  events,
  follows,
  interests,
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

/** Wano Clubs — one per interest, with member counts and whether the given
 * traveller has joined. `viewerTravellerId` is optional so this can render
 * for a signed-out preview too, if ever needed. */
export async function getClubs(viewerTravellerId?: string) {
  const [allInterests, memberCounts, viewerMemberships] = await Promise.all([
    db.select().from(interests).orderBy(interests.sortOrder),
    db
      .select({ interestId: clubMemberships.interestId, total: count() })
      .from(clubMemberships)
      .groupBy(clubMemberships.interestId),
    viewerTravellerId
      ? db
          .select({ interestId: clubMemberships.interestId })
          .from(clubMemberships)
          .where(eq(clubMemberships.travellerId, viewerTravellerId))
      : Promise.resolve([]),
  ]);

  const countMap = new Map(memberCounts.map((r) => [r.interestId, r.total]));
  const joinedSet = new Set(viewerMemberships.map((r) => r.interestId));

  return allInterests.map((interest) => ({
    interest,
    memberCount: countMap.get(interest.id) ?? 0,
    joined: joinedSet.has(interest.id),
  }));
}

export async function getClubByKey(key: string) {
  const [interest] = await db.select().from(interests).where(eq(interests.key, key)).limit(1);
  return interest ?? null;
}

export async function getClubMembers(interestId: string) {
  return db
    .select({ traveller: travellerProfiles, user: users, joinedAt: clubMemberships.joinedAt })
    .from(clubMemberships)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, clubMemberships.travellerId))
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(eq(clubMemberships.interestId, interestId))
    .orderBy(clubMemberships.joinedAt);
}

export async function isClubMember(travellerId: string, interestId: string) {
  const [row] = await db
    .select()
    .from(clubMemberships)
    .where(and(eq(clubMemberships.travellerId, travellerId), eq(clubMemberships.interestId, interestId)))
    .limit(1);
  return row != null;
}
