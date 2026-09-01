import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { journalPosts, users } from "@/db/schema";

export async function getPublishedJournalPosts(limit = 50) {
  return db
    .select({ post: journalPosts, authorName: users.name })
    .from(journalPosts)
    .innerJoin(users, eq(users.id, journalPosts.authorUserId))
    .where(and(eq(journalPosts.status, "published"), sql`${journalPosts.publishedAt} <= now()`))
    .orderBy(desc(journalPosts.publishedAt))
    .limit(limit);
}

export async function getJournalPostBySlug(slug: string) {
  const [row] = await db
    .select({ post: journalPosts, authorName: users.name })
    .from(journalPosts)
    .innerJoin(users, eq(users.id, journalPosts.authorUserId))
    .where(and(eq(journalPosts.slug, slug), eq(journalPosts.status, "published")))
    .limit(1);
  return row ?? null;
}

export async function getRelatedJournalPosts(tags: string[], excludeId: string, limit = 3) {
  if (tags.length === 0) return [];
  const tagArray = sql.join(
    tags.map((t) => sql`${t}`),
    sql`, `,
  );
  const rows = await db
    .select({ post: journalPosts })
    .from(journalPosts)
    .where(
      and(
        eq(journalPosts.status, "published"),
        ne(journalPosts.id, excludeId),
        sql`${journalPosts.tags} && ARRAY[${tagArray}]::text[]`,
      ),
    )
    .orderBy(desc(journalPosts.publishedAt))
    .limit(limit);
  return rows.map((r) => r.post);
}

export async function getAllJournalPostsForAdmin() {
  return db
    .select({ post: journalPosts, authorName: users.name })
    .from(journalPosts)
    .innerJoin(users, eq(users.id, journalPosts.authorUserId))
    .orderBy(desc(journalPosts.createdAt));
}

export async function getJournalPostById(id: string) {
  const [row] = await db.select().from(journalPosts).where(eq(journalPosts.id, id)).limit(1);
  return row ?? null;
}

/** Draft/scheduled posts whose scheduled time has passed still need to flip
 * to published — see /api/cron/feed, which calls this alongside the
 * time-based feed generators. */
export async function getDueScheduledJournalPosts() {
  return db
    .select()
    .from(journalPosts)
    .where(
      and(
        eq(journalPosts.status, "scheduled"),
        or(sql`${journalPosts.publishedAt} IS NULL`, sql`${journalPosts.publishedAt} <= now()`),
      ),
    );
}

export async function getAdminAuthors() {
  return db.select({ id: users.id, name: users.name }).from(users).where(eq(users.role, "admin"));
}
