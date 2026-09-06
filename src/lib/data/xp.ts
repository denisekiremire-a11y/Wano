import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events, travellerProfiles, xpBookings, xpDraws } from "@/db/schema";
import { MATCH_DAY_CATEGORY, WANO_XP_SEAT_CAP } from "@/lib/xp-config";

export async function getMatchDayEvents() {
  return db
    .select()
    .from(events)
    .where(and(eq(events.category, MATCH_DAY_CATEGORY), eq(events.active, true)))
    .orderBy(events.startAt);
}

export async function getMatchById(matchId: string) {
  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, matchId), eq(events.category, MATCH_DAY_CATEGORY)))
    .limit(1);
  return event ?? null;
}

export async function getSeatsTakenForMatch(matchId: string) {
  const rows = await db
    .select({ seats: xpBookings.seats })
    .from(xpBookings)
    .where(and(eq(xpBookings.matchId, matchId), eq(xpBookings.status, "confirmed")));
  return rows.reduce((sum, r) => sum + r.seats, 0);
}

export async function getSeatsRemainingForMatch(matchId: string) {
  const taken = await getSeatsTakenForMatch(matchId);
  return Math.max(0, WANO_XP_SEAT_CAP - taken);
}

export async function getMyXpBookingsForMatch(travellerId: string, matchId: string) {
  return db
    .select()
    .from(xpBookings)
    .where(and(eq(xpBookings.travellerId, travellerId), eq(xpBookings.matchId, matchId)))
    .orderBy(desc(xpBookings.createdAt));
}

export async function getMyXpBookings(travellerId: string) {
  return db
    .select({ booking: xpBookings, match: events })
    .from(xpBookings)
    .innerJoin(events, eq(xpBookings.matchId, events.id))
    .where(eq(xpBookings.travellerId, travellerId))
    .orderBy(desc(xpBookings.createdAt));
}

export async function getConfirmedBookingsForMatch(matchId: string) {
  return db
    .select()
    .from(xpBookings)
    .where(and(eq(xpBookings.matchId, matchId), eq(xpBookings.status, "confirmed")));
}

export async function getXpDrawForMatch(matchId: string) {
  const [row] = await db
    .select({ draw: xpDraws, winner: travellerProfiles })
    .from(xpDraws)
    .leftJoin(travellerProfiles, eq(xpDraws.winnerTravellerId, travellerProfiles.id))
    .where(eq(xpDraws.matchId, matchId))
    .limit(1);
  return row ?? null;
}

/** Every match-day event with its seat count and draw state — the admin
 * Match Day overview. */
export async function getMatchesForAdmin() {
  const matches = await getMatchDayEvents();
  if (matches.length === 0) return [];

  const matchIds = matches.map((m) => m.id);
  const [allBookings, allDraws] = await Promise.all([
    db
      .select()
      .from(xpBookings)
      .where(and(inArray(xpBookings.matchId, matchIds), eq(xpBookings.status, "confirmed"))),
    db
      .select({ draw: xpDraws, winner: travellerProfiles })
      .from(xpDraws)
      .leftJoin(travellerProfiles, eq(xpDraws.winnerTravellerId, travellerProfiles.id))
      .where(inArray(xpDraws.matchId, matchIds)),
  ]);

  return matches.map((match) => {
    const seatsTaken = allBookings
      .filter((b) => b.matchId === match.id)
      .reduce((sum, b) => sum + b.seats, 0);
    const draw = allDraws.find((d) => d.draw.matchId === match.id) ?? null;
    const confirmedCount = allBookings.filter((b) => b.matchId === match.id).length;
    return { match, seatsTaken, confirmedCount, draw };
  });
}
