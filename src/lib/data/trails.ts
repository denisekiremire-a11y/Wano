import "server-only";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { bookings, listings, trailCompletions, trailListings, trails } from "@/db/schema";
import { withRlsContext } from "@/lib/db-context";
import type { DbOrTx } from "@/lib/db-context";

export async function getAllTrailsForAdmin(client: DbOrTx = db) {
  return client.select().from(trails).orderBy(trails.name);
}

export async function getTrailById(trailId: string, client: DbOrTx = db) {
  const [row] = await client.select().from(trails).where(eq(trails.id, trailId)).limit(1);
  return row ?? null;
}

export async function getTrailListings(trailId: string, client: DbOrTx = db) {
  return client
    .select({ trailListingId: trailListings.id, listing: listings })
    .from(trailListings)
    .innerJoin(listings, eq(trailListings.listingId, listings.id))
    .where(eq(trailListings.trailId, trailId));
}

/** Every active trail with its listings and each one's completion state
 * for this traveller — what the Passport's trail stamps render from.
 * "progress" counts listings the traveller has a qualifying booking at,
 * same forgiving confirmed-or-completed check the completion hook uses. */
export async function getTrailProgressForTraveller(travellerId: string, client: DbOrTx = db) {
  const [allTrails, allTrailListings, myCompletions] = await Promise.all([
    client.select().from(trails).where(eq(trails.active, true)).orderBy(trails.name),
    client
      .select({ trailId: trailListings.trailId, listingId: trailListings.listingId, title: listings.title })
      .from(trailListings)
      .innerJoin(listings, eq(trailListings.listingId, listings.id)),
    client.select().from(trailCompletions).where(eq(trailCompletions.travellerId, travellerId)),
  ]);

  const myQualifyingBookings = await withRlsContext({ role: "traveller", travellerProfileId: travellerId }, (tx) =>
    tx
      .select({ listingId: bookings.listingId })
      .from(bookings)
      .where(
        and(
          eq(bookings.travellerId, travellerId),
          or(eq(bookings.status, "confirmed"), eq(bookings.status, "completed")),
        ),
      ),
  );
  const visitedListingIds = new Set(myQualifyingBookings.map((b) => b.listingId).filter((id): id is string => id != null));
  const completedTrailIds = new Set(myCompletions.map((c) => c.trailId));

  return allTrails.map((trail) => {
    const trailListingRows = allTrailListings.filter((tl) => tl.trailId === trail.id);
    const visitedCount = trailListingRows.filter((tl) => visitedListingIds.has(tl.listingId)).length;
    return {
      trail,
      listings: trailListingRows,
      visitedCount,
      totalCount: trailListingRows.length,
      completed: completedTrailIds.has(trail.id),
    };
  });
}

/** Called from the booking-completion cron right after a booking flips to
 * completed — checks every active trail containing this listing, and for
 * each one the traveller hasn't already completed, whether they now have
 * a qualifying (confirmed/completed) booking at every listing in it. The
 * unique(trailId, travellerId) constraint backstops idempotency under a
 * race; this is a plain select-then-insert-if-missing, same style as
 * awardReferralCreditOnFirstBooking. */
export async function checkAndAwardTrailCompletions(travellerId: string, listingId: string) {
  const candidateTrailIds = await db
    .select({ trailId: trailListings.trailId })
    .from(trailListings)
    .innerJoin(trails, eq(trailListings.trailId, trails.id))
    .where(and(eq(trailListings.listingId, listingId), eq(trails.active, true)));
  if (candidateTrailIds.length === 0) return;

  const trailIds = [...new Set(candidateTrailIds.map((t) => t.trailId))];

  const [alreadyCompleted, allMembers, myQualifyingBookings] = await Promise.all([
    db
      .select({ trailId: trailCompletions.trailId })
      .from(trailCompletions)
      .where(and(eq(trailCompletions.travellerId, travellerId), inArray(trailCompletions.trailId, trailIds))),
    db.select().from(trailListings).where(inArray(trailListings.trailId, trailIds)),
    withRlsContext({ role: "traveller", travellerProfileId: travellerId }, (tx) =>
      tx
        .select({ listingId: bookings.listingId })
        .from(bookings)
        .where(
          and(
            eq(bookings.travellerId, travellerId),
            or(eq(bookings.status, "confirmed"), eq(bookings.status, "completed")),
          ),
        ),
    ),
  ]);
  const alreadyCompletedIds = new Set(alreadyCompleted.map((c) => c.trailId));
  const visitedListingIds = new Set(myQualifyingBookings.map((b) => b.listingId).filter((id): id is string => id != null));

  for (const trailId of trailIds) {
    if (alreadyCompletedIds.has(trailId)) continue;
    const members = allMembers.filter((m) => m.trailId === trailId);
    const allVisited = members.length > 0 && members.every((m) => visitedListingIds.has(m.listingId));
    if (!allVisited) continue;

    await withRlsContext({ role: "admin" }, (tx) =>
      tx
        .insert(trailCompletions)
        .values({ trailId, travellerId })
        .onConflictDoNothing({ target: [trailCompletions.trailId, trailCompletions.travellerId] }),
    );
  }
}
