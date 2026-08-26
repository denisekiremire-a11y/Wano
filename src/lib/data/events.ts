import { and, asc, count, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { eventAttendance, events, follows, travellerProfiles, users, vendorProfiles } from "@/db/schema";

export async function getUpcomingEvents(filters: { category?: string } = {}) {
  const conditions = [eq(events.active, true), gte(events.startAt, new Date())];
  const rows = await db
    .select({ event: events, organizer: vendorProfiles })
    .from(events)
    .leftJoin(vendorProfiles, eq(events.organizerVendorProfileId, vendorProfiles.id))
    .where(filters.category ? and(...conditions, eq(events.category, filters.category)) : and(...conditions))
    .orderBy(asc(events.startAt));
  return rows;
}

export async function getEventsStartingWithinHours(hours: number, limit = 3) {
  const now = new Date();
  const cutoff = new Date(now.getTime() + hours * 60 * 60 * 1000);
  const rows = await db
    .select({ event: events, organizer: vendorProfiles })
    .from(events)
    .leftJoin(vendorProfiles, eq(events.organizerVendorProfileId, vendorProfiles.id))
    .where(and(eq(events.active, true), gte(events.startAt, now)))
    .orderBy(asc(events.startAt));
  return rows.filter((r) => new Date(r.event.startAt) <= cutoff).slice(0, limit);
}

export async function getEventById(id: string) {
  const [row] = await db
    .select({ event: events, organizer: vendorProfiles })
    .from(events)
    .leftJoin(vendorProfiles, eq(events.organizerVendorProfileId, vendorProfiles.id))
    .where(eq(events.id, id))
    .limit(1);
  return row ?? null;
}

export type AttendanceCounts = { going: number; interested: number; maybe: number };

export async function getAttendanceCounts(eventIds: string[]): Promise<Map<string, AttendanceCounts>> {
  const map = new Map<string, AttendanceCounts>();
  if (eventIds.length === 0) return map;

  const rows = await db
    .select({ eventId: eventAttendance.eventId, status: eventAttendance.status, total: count() })
    .from(eventAttendance)
    .where(and(inArray(eventAttendance.eventId, eventIds), eq(eventAttendance.visible, true)))
    .groupBy(eventAttendance.eventId, eventAttendance.status);

  for (const row of rows) {
    const entry = map.get(row.eventId) ?? { going: 0, interested: 0, maybe: 0 };
    entry[row.status] = row.total;
    map.set(row.eventId, entry);
  }
  return map;
}

export async function getMyAttendance(eventId: string, travellerId: string) {
  const [row] = await db
    .select()
    .from(eventAttendance)
    .where(and(eq(eventAttendance.eventId, eventId), eq(eventAttendance.travellerId, travellerId)))
    .limit(1);
  return row ?? null;
}

/** Names of people the given traveller follows who are Going/Interested —
 * powers the "X people you follow are going" line on an event page. */
export async function getFollowedAttendees(eventId: string, travellerId: string) {
  const rows = await db
    .select({ name: travellerProfiles.displayName, status: eventAttendance.status })
    .from(eventAttendance)
    .innerJoin(follows, eq(follows.followingId, eventAttendance.travellerId))
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, eventAttendance.travellerId))
    .where(and(eq(eventAttendance.eventId, eventId), eq(follows.followerId, travellerId)));
  return rows;
}

export async function getEventAttendees(eventId: string) {
  return db
    .select({
      status: eventAttendance.status,
      displayName: travellerProfiles.displayName,
      username: users.username,
    })
    .from(eventAttendance)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, eventAttendance.travellerId))
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(and(eq(eventAttendance.eventId, eventId), eq(eventAttendance.visible, true)));
}

export async function getDistinctEventCategories() {
  const rows = await db.selectDistinct({ category: events.category }).from(events);
  return rows.map((r) => r.category).sort();
}
