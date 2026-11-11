import { and, asc, count, eq, gte, ilike, inArray, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { withRlsContext } from "@/lib/db-context";
import { kampalaDayBounds } from "@/lib/kampala-time";
import { bookings, eventAttendance, events, follows, travellerProfiles, users, vendorProfiles } from "@/db/schema";
import { getMutualFollowIds } from "@/lib/data/social";

const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed"] as const;

export async function searchEvents(query: string, limit = 10) {
  const q = query.trim();
  if (q.length < 2) return [];
  const pattern = `%${q}%`;
  return db
    .select({ event: events, organizer: vendorProfiles })
    .from(events)
    .leftJoin(vendorProfiles, eq(events.organizerVendorProfileId, vendorProfiles.id))
    .where(
      and(
        eq(events.active, true),
        gte(events.startAt, new Date()),
        or(ilike(events.title, pattern), ilike(events.description, pattern), ilike(events.location, pattern))!,
      ),
    )
    .orderBy(asc(events.startAt))
    .limit(limit);
}

export async function getUpcomingEvents(filters: { category?: string; venueId?: string } = {}) {
  const conditions = [eq(events.active, true), gte(events.startAt, new Date())];
  if (filters.category) conditions.push(eq(events.category, filters.category));
  if (filters.venueId) conditions.push(eq(events.venueId, filters.venueId));
  const rows = await db
    .select({ event: events, organizer: vendorProfiles })
    .from(events)
    .leftJoin(vendorProfiles, eq(events.organizerVendorProfileId, vendorProfiles.id))
    .where(and(...conditions))
    .orderBy(asc(events.startAt));
  return rows;
}

/** Events starting later today (Kampala calendar day — the server runs in
 * UTC, so a server-local day would roll over at 3 am Kampala time). */
export async function getEventsForToday(limit = 4) {
  const now = new Date();
  const { end } = kampalaDayBounds(now);
  const rows = await db
    .select({ event: events, organizer: vendorProfiles })
    .from(events)
    .leftJoin(vendorProfiles, eq(events.organizerVendorProfileId, vendorProfiles.id))
    .where(and(eq(events.active, true), gte(events.startAt, now), lt(events.startAt, end)))
    .orderBy(asc(events.startAt))
    .limit(limit);
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

// The /events/[id] page's own "who's going" now comes from real bookings
// rather than the lighter-weight eventAttendance table above (still used
// elsewhere — clubs, AFCON venue pages) — a booking is the RSVP for a
// standalone event now, not a separate click.

/** Total attendee count per event (sum of partySize, defaulting to 1 for
 * bookings that didn't set one) across pending+confirmed bookings. */
export async function getEventBookingCounts(eventIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (eventIds.length === 0) return map;
  const rows = await db
    .select({ eventId: bookings.eventId, partySize: bookings.partySize })
    .from(bookings)
    .where(and(inArray(bookings.eventId, eventIds), inArray(bookings.status, ACTIVE_BOOKING_STATUSES)));
  for (const row of rows) {
    if (!row.eventId) continue;
    map.set(row.eventId, (map.get(row.eventId) ?? 0) + (row.partySize ?? 1));
  }
  return map;
}

/** Distinct travellers with an active booking for this event, for the
 * avatar/name "Who's going" list — not the raw per-booking rows (one
 * traveller can hold more than one booking). Excludes anyone with the
 * attendee-list privacy toggle on; the numeric "N going" count (see
 * getEventBookingCounts) is unaffected by that toggle. With
 * `viewerTravellerId`, mutual connections (see getMutualFollowIds) sort
 * first. */
export async function getEventBookers(eventId: string, viewerTravellerId?: string | null) {
  const rows = await db
    .select({
      travellerId: travellerProfiles.id,
      displayName: travellerProfiles.displayName,
      username: users.username,
      hideFromAttendeeLists: travellerProfiles.hideFromAttendeeLists,
    })
    .from(bookings)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, bookings.travellerId))
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(and(eq(bookings.eventId, eventId), inArray(bookings.status, ACTIVE_BOOKING_STATUSES)));

  const byTraveller = new Map<string, { travellerId: string; displayName: string; username: string | null }>();
  for (const row of rows) {
    if (row.hideFromAttendeeLists || byTraveller.has(row.travellerId)) continue;
    byTraveller.set(row.travellerId, {
      travellerId: row.travellerId,
      displayName: row.displayName,
      username: row.username,
    });
  }
  const list = [...byTraveller.values()];
  if (!viewerTravellerId || list.length === 0) return list;

  const mutualIds = await getMutualFollowIds(viewerTravellerId);
  // Array.prototype.sort is stable (ES2019+), so ties keep booking order
  // without needing to track an explicit index.
  return [...list].sort((a, b) => {
    const aMutual = mutualIds.has(a.travellerId) ? 0 : 1;
    const bMutual = mutualIds.has(b.travellerId) ? 0 : 1;
    return aMutual - bMutual;
  });
}

/** Names of people the given traveller follows who've booked this event —
 * the booking-based counterpart to getFollowedAttendees. */
export async function getFollowedEventBookers(eventId: string, travellerId: string) {
  const rows = await db
    .select({ name: travellerProfiles.displayName })
    .from(bookings)
    .innerJoin(follows, eq(follows.followingId, bookings.travellerId))
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, bookings.travellerId))
    .where(
      and(
        eq(bookings.eventId, eventId),
        eq(follows.followerId, travellerId),
        inArray(bookings.status, ACTIVE_BOOKING_STATUSES),
      ),
    );
  return rows;
}

/** First names of people the member follows who have booked, or marked
 * themselves going, for each event. Powers "Joan and 2 friends going" on
 * the home cards. Read as a trusted aggregate, names only. */
export async function getFriendsGoingByEvent(travellerId: string, eventIds: string[]) {
  const map = new Map<string, string[]>();
  if (eventIds.length === 0) return map;
  const [booked, marked] = await withRlsContext({ role: "admin" }, (tx) =>
    Promise.all([
      tx
        .select({ eventId: bookings.eventId, id: travellerProfiles.id, name: travellerProfiles.displayName })
        .from(bookings)
        .innerJoin(follows, eq(follows.followingId, bookings.travellerId))
        .innerJoin(travellerProfiles, eq(travellerProfiles.id, bookings.travellerId))
        .where(
          and(
            inArray(bookings.eventId, eventIds),
            eq(follows.followerId, travellerId),
            inArray(bookings.status, ACTIVE_BOOKING_STATUSES),
          ),
        ),
      tx
        .select({ eventId: eventAttendance.eventId, id: travellerProfiles.id, name: travellerProfiles.displayName })
        .from(eventAttendance)
        .innerJoin(follows, eq(follows.followingId, eventAttendance.travellerId))
        .innerJoin(travellerProfiles, eq(travellerProfiles.id, eventAttendance.travellerId))
        .where(
          and(
            inArray(eventAttendance.eventId, eventIds),
            eq(follows.followerId, travellerId),
            eq(eventAttendance.status, "going"),
            eq(eventAttendance.visible, true),
          ),
        ),
    ]),
  );
  const seen = new Set<string>();
  for (const r of [...booked, ...marked]) {
    if (!r.eventId || seen.has(`${r.eventId}:${r.id}`)) continue;
    seen.add(`${r.eventId}:${r.id}`);
    map.set(r.eventId, [...(map.get(r.eventId) ?? []), r.name.split(" ")[0]]);
  }
  return map;
}

/** "Joan going", "Joan and Sam going", "Joan and 3 friends going". */
export function friendsGoingLabel(names: string[]): string | null {
  if (names.length === 0) return null;
  if (names.length === 1) return `${names[0]} is going`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are going`;
  return `${names[0]} and ${names.length - 1} friends are going`;
}

/** Has this traveller already got a booking against this event? Used to
 * decide whether the page shows "Book" or "You're booked" state. */
export async function getMyEventBooking(eventId: string, travellerId: string): Promise<typeof bookings.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.eventId, eventId),
        eq(bookings.travellerId, travellerId),
        inArray(bookings.status, ACTIVE_BOOKING_STATUSES),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getDistinctEventCategories() {
  const rows = await db.selectDistinct({ category: events.category }).from(events);
  return rows.map((r) => r.category).sort();
}
