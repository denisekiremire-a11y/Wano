import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { analyticsEvents, documentAccessLogs, users, vendorDocuments } from "@/db/schema";

export async function getEventCounts() {
  return db
    .select({ eventName: analyticsEvents.eventName, total: count() })
    .from(analyticsEvents)
    .groupBy(analyticsEvents.eventName)
    .orderBy(desc(count()));
}

export async function getRecentEvents(limit = 50) {
  return db
    .select({ event: analyticsEvents, user: users })
    .from(analyticsEvents)
    .leftJoin(users, eq(users.id, analyticsEvents.userId))
    .orderBy(desc(analyticsEvents.createdAt))
    .limit(limit);
}

export async function getRecentDocumentAccess(limit = 50) {
  return db
    .select({ log: documentAccessLogs, doc: vendorDocuments, accessedBy: users })
    .from(documentAccessLogs)
    .innerJoin(vendorDocuments, eq(vendorDocuments.id, documentAccessLogs.documentId))
    .innerJoin(users, eq(users.id, documentAccessLogs.accessedByUserId))
    .orderBy(desc(documentAccessLogs.accessedAt))
    .limit(limit);
}
