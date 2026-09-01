import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { blocks, moderationActions, postComments, posts, reports, travellerProfiles, users } from "@/db/schema";

export async function getOpenReports() {
  return db
    .select({ report: reports, reporter: travellerProfiles })
    .from(reports)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, reports.reporterId))
    .where(eq(reports.status, "open"))
    .orderBy(desc(reports.createdAt));
}

export async function getPendingReviewPosts() {
  return db
    .select({ post: posts, author: travellerProfiles, authorUser: users })
    .from(posts)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, posts.travellerId))
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(eq(posts.status, "pending_review"))
    .orderBy(desc(posts.createdAt));
}

export async function getModerationLog(limit = 50) {
  return db
    .select({ action: moderationActions, performedBy: users })
    .from(moderationActions)
    .innerJoin(users, eq(users.id, moderationActions.performedByUserId))
    .orderBy(desc(moderationActions.createdAt))
    .limit(limit);
}

/** Post content, for showing a reported post/comment in context on the
 * admin queue. */
export async function getPostForModeration(postId: string) {
  const [row] = await db
    .select({ post: posts, author: travellerProfiles })
    .from(posts)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, posts.travellerId))
    .where(eq(posts.id, postId))
    .limit(1);
  return row ?? null;
}

export async function getCommentForModeration(commentId: string) {
  const [row] = await db
    .select({ comment: postComments, author: travellerProfiles })
    .from(postComments)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, postComments.travellerId))
    .where(eq(postComments.id, commentId))
    .limit(1);
  return row ?? null;
}

/** targetId for a "user" report is a travellerProfiles.id, same as blocks
 * use — kept consistent so a report and a block on the same person always
 * mean the same id. */
export async function getUserForModeration(travellerId: string) {
  const [row] = await db
    .select({ traveller: travellerProfiles, user: users })
    .from(travellerProfiles)
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(eq(travellerProfiles.id, travellerId))
    .limit(1);
  return row ?? null;
}

export async function getBlockedTravellerIds(travellerId: string) {
  const [blockedByMe, blockedMe] = await Promise.all([
    db.select({ id: blocks.blockedId }).from(blocks).where(eq(blocks.blockerId, travellerId)),
    db.select({ id: blocks.blockerId }).from(blocks).where(eq(blocks.blockedId, travellerId)),
  ]);
  return new Set([...blockedByMe.map((r) => r.id), ...blockedMe.map((r) => r.id)]);
}

export async function getMyBlockedList(travellerId: string) {
  return db
    .select({ traveller: travellerProfiles, user: users, blockedAt: blocks.createdAt })
    .from(blocks)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, blocks.blockedId))
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(eq(blocks.blockerId, travellerId))
    .orderBy(desc(blocks.createdAt));
}
