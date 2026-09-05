import { and, count, desc, eq, gte, ilike, inArray, lt, or } from "drizzle-orm";
import { db } from "@/db";
import {
  clubMemberships,
  clubs,
  events,
  follows,
  interests,
  postComments,
  postImages,
  postLikes,
  posts,
  travellerProfiles,
  users,
  vendorProfiles,
} from "@/db/schema";
import { AFCON_CLUB_ENABLED, LAUNCH_CLUB_CATEGORY_KEYS } from "@/lib/feature-flags";

export async function getPostsByTraveller(travellerId: string) {
  return db
    .select({ post: posts, audienceClub: clubs })
    .from(posts)
    .leftJoin(clubs, eq(clubs.id, posts.audienceClubId))
    .where(eq(posts.travellerId, travellerId))
    .orderBy(desc(posts.createdAt));
}

/** Media feed for a listing/event detail page ("What people are saying"),
 * or a club's own page (posts addressed to it) — newest first, visible only. */
export async function getMediaPostsFor(target: { listingId?: string; clubId?: string; eventId?: string }) {
  const condition = target.listingId
    ? and(eq(posts.contextType, "listing"), eq(posts.contextId, target.listingId))
    : target.eventId
      ? and(eq(posts.contextType, "event"), eq(posts.contextId, target.eventId))
      : target.clubId
        ? eq(posts.audienceClubId, target.clubId)
        : undefined;
  if (!condition) return [];

  return db
    .select({ post: posts, author: travellerProfiles, authorUser: users })
    .from(posts)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, posts.travellerId))
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(and(condition, eq(posts.status, "visible")))
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

export async function getPostImageIds(postIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (postIds.length === 0) return map;
  const rows = await db
    .select({ id: postImages.id, postId: postImages.postId })
    .from(postImages)
    .where(inArray(postImages.postId, postIds))
    .orderBy(postImages.sortOrder);
  for (const row of rows) {
    const list = map.get(row.postId) ?? [];
    list.push(row.id);
    map.set(row.postId, list);
  }
  return map;
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

/** Traveller search by display name or @username, for the Social page
 * search box. Requires 2+ characters so it doesn't return the whole table
 * on an empty query. */
export async function searchTravellers(query: string, excludeTravellerId: string | null, limit = 10) {
  const q = query.trim();
  if (q.length < 2) return [];
  const pattern = `%${q}%`;

  const rows = await db
    .select({ traveller: travellerProfiles, user: users })
    .from(travellerProfiles)
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(or(ilike(travellerProfiles.displayName, pattern), ilike(users.username, pattern)))
    .limit(limit + 1);

  return rows.filter((r) => r.traveller.id !== excludeTravellerId).slice(0, limit);
}

export async function getAllInterests() {
  return db.select().from(interests).orderBy(interests.sortOrder);
}

/** Categories to browse clubs by (the interest taxonomy), each with a count
 * of *approved* clubs inside it — so "Food & Dining" can hold many distinct
 * clubs instead of being a club itself. Limited to the 4 launch categories
 * (+ AFCON behind its flag) — see LAUNCH_CLUB_CATEGORY_KEYS. Everything
 * else that used to show as an always-empty tile is gone; "Start a club" is
 * the entry point for those instead. */
export async function getClubCategories() {
  const allowedKeys = [...LAUNCH_CLUB_CATEGORY_KEYS, ...(AFCON_CLUB_ENABLED ? (["afcon"] as const) : [])];

  const [allInterests, clubCounts] = await Promise.all([
    db.select().from(interests).orderBy(interests.sortOrder),
    db
      .select({ interestId: clubs.interestId, total: count() })
      .from(clubs)
      .where(eq(clubs.status, "approved"))
      .groupBy(clubs.interestId),
  ]);
  const countMap = new Map(clubCounts.map((r) => [r.interestId, r.total]));
  return allInterests
    .filter((interest) => (allowedKeys as readonly string[]).includes(interest.key))
    .map((interest) => ({
      interest,
      clubCount: countMap.get(interest.id) ?? 0,
    }));
}

export async function getApprovedClubsByCategory(interestKey: string, viewerTravellerId?: string) {
  const [interest] = await db.select().from(interests).where(eq(interests.key, interestKey)).limit(1);
  if (!interest) return { interest: null, clubs: [] };

  const rows = await db
    .select({ club: clubs, vendorProfile: vendorProfiles })
    .from(clubs)
    .leftJoin(vendorProfiles, eq(vendorProfiles.id, clubs.vendorProfileId))
    .where(and(eq(clubs.interestId, interest.id), eq(clubs.status, "approved")))
    .orderBy(desc(clubs.createdAt));

  const clubIds = rows.map((r) => r.club.id);
  const [memberCounts, viewerMemberships] = await Promise.all([
    clubIds.length
      ? db
          .select({ clubId: clubMemberships.clubId, total: count() })
          .from(clubMemberships)
          .where(inArray(clubMemberships.clubId, clubIds))
          .groupBy(clubMemberships.clubId)
      : Promise.resolve([]),
    viewerTravellerId && clubIds.length
      ? db
          .select({ clubId: clubMemberships.clubId })
          .from(clubMemberships)
          .where(
            and(eq(clubMemberships.travellerId, viewerTravellerId), inArray(clubMemberships.clubId, clubIds)),
          )
      : Promise.resolve([]),
  ]);
  const countMap = new Map(memberCounts.map((r) => [r.clubId, r.total]));
  const joinedSet = new Set(viewerMemberships.map((r) => r.clubId));

  return {
    interest,
    clubs: rows.map((r) => ({
      ...r,
      memberCount: countMap.get(r.club.id) ?? 0,
      joined: joinedSet.has(r.club.id),
    })),
  };
}

export async function getClubById(clubId: string) {
  const [row] = await db
    .select({ club: clubs, interest: interests, vendorProfile: vendorProfiles, host: users })
    .from(clubs)
    .innerJoin(interests, eq(interests.id, clubs.interestId))
    .leftJoin(vendorProfiles, eq(vendorProfiles.id, clubs.vendorProfileId))
    .leftJoin(users, eq(users.id, clubs.hostUserId))
    .where(eq(clubs.id, clubId))
    .limit(1);
  return row ?? null;
}

export async function getClubBySlug(slug: string) {
  const [row] = await db
    .select({ club: clubs, interest: interests, vendorProfile: vendorProfiles, host: users })
    .from(clubs)
    .innerJoin(interests, eq(interests.id, clubs.interestId))
    .leftJoin(vendorProfiles, eq(vendorProfiles.id, clubs.vendorProfileId))
    .leftJoin(users, eq(users.id, clubs.hostUserId))
    .where(eq(clubs.slug, slug))
    .limit(1);
  return row ?? null;
}

/** Meetups are just events with clubId set — not a parallel system. */
export async function getClubMeetups(clubId: string) {
  const now = new Date();
  const [upcoming, past] = await Promise.all([
    db
      .select()
      .from(events)
      .where(and(eq(events.clubId, clubId), gte(events.startAt, now)))
      .orderBy(events.startAt),
    db
      .select()
      .from(events)
      .where(and(eq(events.clubId, clubId), lt(events.startAt, now)))
      .orderBy(desc(events.startAt))
      .limit(10),
  ]);
  return { upcoming, past };
}

export async function hasUpcomingMeetup(clubId: string) {
  const [row] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.clubId, clubId), gte(events.startAt, new Date())))
    .limit(1);
  return Boolean(row);
}

/** Clubs a traveller belongs to — for the "post to this club instead"
 * audience picker on their own posts. */
export async function getMyClubs(travellerId: string) {
  const rows = await db
    .select({ club: clubs })
    .from(clubMemberships)
    .innerJoin(clubs, eq(clubs.id, clubMemberships.clubId))
    .where(eq(clubMemberships.travellerId, travellerId));
  return rows.map((r) => r.club);
}

export async function getClubMembers(clubId: string) {
  return db
    .select({ traveller: travellerProfiles, user: users, joinedAt: clubMemberships.joinedAt })
    .from(clubMemberships)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, clubMemberships.travellerId))
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(eq(clubMemberships.clubId, clubId))
    .orderBy(clubMemberships.joinedAt);
}

export async function isClubMember(travellerId: string, clubId: string) {
  const [row] = await db
    .select()
    .from(clubMemberships)
    .where(and(eq(clubMemberships.travellerId, travellerId), eq(clubMemberships.clubId, clubId)))
    .limit(1);
  return row != null;
}

/** A vendor's own submitted clubs (any status) — for their dashboard. */
export async function getVendorClubs(vendorProfileId: string) {
  return db
    .select({ club: clubs, interest: interests })
    .from(clubs)
    .innerJoin(interests, eq(interests.id, clubs.interestId))
    .where(eq(clubs.vendorProfileId, vendorProfileId))
    .orderBy(desc(clubs.createdAt));
}

/** All clubs for the admin Clubs page — pending ones need review, the rest
 * are just listed for visibility/management. */
export async function getAllClubsForAdmin() {
  return db
    .select({ club: clubs, interest: interests, vendorProfile: vendorProfiles })
    .from(clubs)
    .innerJoin(interests, eq(interests.id, clubs.interestId))
    .leftJoin(vendorProfiles, eq(vendorProfiles.id, clubs.vendorProfileId))
    .orderBy(desc(clubs.createdAt));
}
