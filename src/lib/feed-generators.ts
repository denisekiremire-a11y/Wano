import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  eventAttendance,
  events,
  feedItems,
  listings,
  posts,
  promoCodes,
  reviews,
  travellerProfiles,
  vendorProfiles,
} from "@/db/schema";

/** RSVP counts at which an event gets a fresh event_momentum feed item. */
const MOMENTUM_THRESHOLDS = [3, 10, 25] as const;
const EVENT_UPCOMING_WINDOW_DAYS = 3;
const PERK_EXPIRING_WINDOW_DAYS = 5;

/** Returns true if this call actually inserted a new row (false when the
 * dedupeKey already existed and onConflictDoNothing skipped it). */
async function insertFeedItem(row: typeof feedItems.$inferInsert) {
  const inserted = await db
    .insert(feedItems)
    .values(row)
    .onConflictDoNothing({ target: feedItems.dedupeKey })
    .returning({ id: feedItems.id });
  return inserted.length > 0;
}

/** Call once a listing exists AND its vendor is accredited "trusted" — the
 * two conditions the spec calls "published and verified". */
export async function generatePlaceAddedItem(listingId: string) {
  const [row] = await db
    .select({ listing: listings, vendor: vendorProfiles })
    .from(listings)
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, listings.vendorProfileId))
    .where(and(eq(listings.id, listingId), eq(vendorProfiles.accreditationStatus, "trusted")))
    .limit(1);
  if (!row) return;

  await insertFeedItem({
    type: "place_added",
    dedupeKey: `place_added:${listingId}`,
    listingId,
    city: row.vendor.location,
    payload: {
      kind: "place_added",
      title: row.listing.title,
      subtitle: `${row.vendor.businessName} · ${row.listing.type.replace("_", " ")}`,
      href: `/explore/${listingId}`,
    },
  });
}

/** Backfill place_added for every existing listing once a vendor flips to
 * "trusted" — listings created before accreditation would otherwise never
 * get one, since generatePlaceAddedItem no-ops while status is pending. */
export async function generatePlaceAddedItemsForVendor(vendorProfileId: string) {
  const rows = await db
    .select({ id: listings.id })
    .from(listings)
    .where(and(eq(listings.vendorProfileId, vendorProfileId), eq(listings.active, true)));
  for (const { id } of rows) await generatePlaceAddedItem(id);
}

export async function generateReviewPostedItem(reviewId: string) {
  const [row] = await db
    .select({
      review: reviews,
      listing: listings,
      vendor: vendorProfiles,
      traveller: travellerProfiles,
    })
    .from(reviews)
    .innerJoin(listings, eq(listings.id, reviews.listingId))
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, listings.vendorProfileId))
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, reviews.travellerId))
    .where(eq(reviews.id, reviewId))
    .limit(1);
  if (!row) return;

  await insertFeedItem({
    type: "review_posted",
    dedupeKey: `review_posted:${reviewId}`,
    listingId: row.listing.id,
    subjectTravellerId: row.traveller.id,
    city: row.vendor.location,
    payload: {
      kind: "review_posted",
      listingTitle: row.listing.title,
      rating: row.review.rating,
      comment: row.review.comment,
      reviewerName: row.traveller.displayName,
      href: `/explore/${row.listing.id}#review-${reviewId}`,
    },
  });
}

export async function generatePerkAddedItem(promoCodeId: string) {
  const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.id, promoCodeId)).limit(1);
  if (!promo || !promo.active) return;

  let city: string | null = null;
  if (promo.listingId) {
    const [row] = await db
      .select({ location: vendorProfiles.location })
      .from(listings)
      .innerJoin(vendorProfiles, eq(vendorProfiles.id, listings.vendorProfileId))
      .where(eq(listings.id, promo.listingId))
      .limit(1);
    city = row?.location ?? null;
  }

  await insertFeedItem({
    type: "perk_added",
    dedupeKey: `perk_added:${promoCodeId}`,
    listingId: promo.listingId,
    city,
    payload: {
      kind: "perk_added",
      title: promo.title,
      discountText: promo.discountText,
      href: promo.listingId ? `/explore/${promo.listingId}` : "/passport?tab=rewards",
    },
  });
}

export async function generateUserPostItem(
  postId: string,
  travellerId: string,
  authorName: string,
) {
  await insertFeedItem({
    type: "user_post",
    dedupeKey: `user_post:${postId}`,
    subjectTravellerId: travellerId,
    postId,
    payload: { kind: "user_post", postId, authorName },
  });
}

/** Time-crossing generators — nothing here is triggered by a user action, so
 * it has to run on a schedule. See /api/cron/feed. Every insert is
 * idempotent via dedupeKey, so running this often and re-running it after a
 * failure are both safe. */
export async function runFeedTimeBasedGenerators() {
  const now = new Date();
  const upcomingCutoff = new Date(now.getTime() + EVENT_UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const expiringCutoff = new Date(now.getTime() + PERK_EXPIRING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  let eventUpcomingCreated = 0;
  let eventMomentumCreated = 0;
  let perkExpiringCreated = 0;

  // event_upcoming: within the window, ≥1 RSVP of any status, event is active.
  const candidateEvents = await db
    .select({
      event: events,
      rsvpCount: sql<number>`count(${eventAttendance.id})`.mapWith(Number),
    })
    .from(events)
    .innerJoin(eventAttendance, eq(eventAttendance.eventId, events.id))
    .where(and(eq(events.active, true), gte(events.startAt, now), lte(events.startAt, upcomingCutoff)))
    .groupBy(events.id);

  for (const { event, rsvpCount } of candidateEvents) {
    if (rsvpCount < 1) continue;
    if (
      await insertFeedItem({
        type: "event_upcoming",
        dedupeKey: `event_upcoming:${event.id}`,
        eventId: event.id,
        city: event.location,
        payload: {
          kind: "event_upcoming",
          title: event.title,
          startAt: event.startAt.toISOString(),
          location: event.location,
          href: `/events/${event.id}`,
        },
      })
    ) {
      eventUpcomingCreated++;
    }

    for (const threshold of MOMENTUM_THRESHOLDS) {
      if (rsvpCount < threshold) continue;
      if (
        await insertFeedItem({
          type: "event_momentum",
          dedupeKey: `event_momentum:${event.id}:${threshold}`,
          eventId: event.id,
          city: event.location,
          payload: {
            kind: "event_momentum",
            title: event.title,
            threshold,
            href: `/events/${event.id}`,
          },
        })
      ) {
        eventMomentumCreated++;
      }
    }
  }

  // perk_expiring: active, has an expiry, within the window.
  const expiring = await db
    .select({ promo: promoCodes })
    .from(promoCodes)
    .where(
      and(eq(promoCodes.active, true), gte(promoCodes.expiresAt, now), lte(promoCodes.expiresAt, expiringCutoff)),
    );

  for (const { promo } of expiring) {
    let city: string | null = null;
    if (promo.listingId) {
      const [row] = await db
        .select({ location: vendorProfiles.location })
        .from(listings)
        .innerJoin(vendorProfiles, eq(vendorProfiles.id, listings.vendorProfileId))
        .where(eq(listings.id, promo.listingId))
        .limit(1);
      city = row?.location ?? null;
    }
    if (
      await insertFeedItem({
        type: "perk_expiring",
        dedupeKey: `perk_expiring:${promo.id}`,
        listingId: promo.listingId,
        city,
        payload: {
          kind: "perk_expiring",
          title: promo.title,
          discountText: promo.discountText,
          expiresAt: promo.expiresAt!.toISOString(),
          href: promo.listingId ? `/explore/${promo.listingId}` : "/passport?tab=rewards",
        },
      })
    ) {
      perkExpiringCreated++;
    }
  }

  return { eventUpcomingCreated, eventMomentumCreated, perkExpiringCreated };
}

/** Generates feed_items for everything that already exists — run once after
 * seeding (or after enabling this feature against existing production data)
 * so the feed doesn't start empty. Every insert below is the same
 * dedupe-key-idempotent path the live generators use, so this is safe to
 * run more than once. */
export async function backfillFeedItems() {
  const trustedListings = await db
    .select({ id: listings.id })
    .from(listings)
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, listings.vendorProfileId))
    .where(and(eq(listings.active, true), eq(vendorProfiles.accreditationStatus, "trusted")));
  for (const { id } of trustedListings) await generatePlaceAddedItem(id);

  const allReviews = await db.select({ id: reviews.id }).from(reviews);
  for (const { id } of allReviews) await generateReviewPostedItem(id);

  const activePromos = await db.select({ id: promoCodes.id }).from(promoCodes).where(eq(promoCodes.active, true));
  for (const { id } of activePromos) await generatePerkAddedItem(id);

  const allPosts = await db
    .select({ post: posts, traveller: travellerProfiles })
    .from(posts)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, posts.travellerId));
  for (const { post, traveller } of allPosts) {
    await generateUserPostItem(post.id, traveller.id, traveller.displayName);
  }

  const timeBased = await runFeedTimeBasedGenerators();

  return {
    placeAdded: trustedListings.length,
    reviewPosted: allReviews.length,
    perkAdded: activePromos.length,
    userPost: allPosts.length,
    ...timeBased,
  };
}
