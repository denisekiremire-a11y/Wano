import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";

/** How many rows a traveller has created in the last hour, for a table with
 * a travellerId column and a createdAt column. Used for the per-user
 * per-hour rate limits on posts, comments, and reports. */
export async function countInLastHour(
  table: PgTable,
  travellerIdColumn: AnyPgColumn,
  createdAtColumn: AnyPgColumn,
  travellerId: string,
) {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [row] = await db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(table)
    .where(and(eq(travellerIdColumn, travellerId), gte(createdAtColumn, since)));
  return row?.total ?? 0;
}

export const RATE_LIMITS = {
  postsPerHour: 10,
  commentsPerHour: 30,
  reportsPerHour: 10,
  messagesPerHour: 60,
} as const;
