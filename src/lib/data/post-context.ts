import { and, desc, eq, gte, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  bookings,
  clubs,
  dealClaims,
  eventAttendance,
  events,
  journalPosts,
  journeys,
  listings,
  promoCodes,
  vendorProfiles,
} from "@/db/schema";
import { listingPublishConditions } from "@/lib/listing-publish";
import { listingTypeLabels, type ListingType } from "@/lib/listing-type";

export type PostContextType = "listing" | "event" | "club" | "journey" | "perk" | "journal_post";

export type PostContextCard = {
  type: PostContextType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  ctaLabel: string;
};

const SUGGESTION_WINDOW_MS = 48 * 60 * 60 * 1000;

function key(type: string, id: string) {
  return `${type}:${id}`;
}

/** Batch-resolves a set of (type, id) context refs into display cards, one
 * query per subject table touched rather than one query per post. */
export async function resolvePostContexts(
  refs: { type: PostContextType; id: string }[],
): Promise<Map<string, PostContextCard>> {
  const map = new Map<string, PostContextCard>();
  if (refs.length === 0) return map;

  const idsByType = new Map<PostContextType, Set<string>>();
  for (const ref of refs) {
    if (!idsByType.has(ref.type)) idsByType.set(ref.type, new Set());
    idsByType.get(ref.type)!.add(ref.id);
  }

  const listingIds = [...(idsByType.get("listing") ?? [])];
  if (listingIds.length > 0) {
    const rows = await db.select().from(listings).where(inArray(listings.id, listingIds));
    for (const row of rows) {
      map.set(key("listing", row.id), {
        type: "listing",
        id: row.id,
        title: row.title,
        subtitle: listingTypeLabels[row.type as ListingType] ?? row.type,
        href: `/explore/${row.id}`,
        ctaLabel: "Book",
      });
    }
  }

  const eventIds = [...(idsByType.get("event") ?? [])];
  if (eventIds.length > 0) {
    const rows = await db.select().from(events).where(inArray(events.id, eventIds));
    for (const row of rows) {
      map.set(key("event", row.id), {
        type: "event",
        id: row.id,
        title: row.title,
        subtitle: `${row.location} · ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(row.startAt)}`,
        href: `/events/${row.id}`,
        ctaLabel: "RSVP",
      });
    }
  }

  const clubIds = [...(idsByType.get("club") ?? [])];
  if (clubIds.length > 0) {
    const rows = await db.select().from(clubs).where(inArray(clubs.id, clubIds));
    for (const row of rows) {
      map.set(key("club", row.id), {
        type: "club",
        id: row.id,
        title: row.name,
        subtitle: row.city ?? "Club",
        href: `/social/clubs/${row.id}`,
        ctaLabel: "View club",
      });
    }
  }

  const journeyIds = [...(idsByType.get("journey") ?? [])];
  if (journeyIds.length > 0) {
    const rows = await db.select().from(journeys).where(inArray(journeys.id, journeyIds));
    for (const row of rows) {
      map.set(key("journey", row.id), {
        type: "journey",
        id: row.id,
        title: row.name,
        subtitle: row.location,
        href: `/journeys/${row.slug}`,
        ctaLabel: "Explore",
      });
    }
  }

  const perkIds = [...(idsByType.get("perk") ?? [])];
  if (perkIds.length > 0) {
    const rows = await db.select().from(promoCodes).where(inArray(promoCodes.id, perkIds));
    for (const row of rows) {
      map.set(key("perk", row.id), {
        type: "perk",
        id: row.id,
        title: row.title,
        subtitle: row.discountText,
        href: "/passport?tab=rewards",
        ctaLabel: "Get code",
      });
    }
  }

  const journalIds = [...(idsByType.get("journal_post") ?? [])];
  if (journalIds.length > 0) {
    const rows = await db.select().from(journalPosts).where(inArray(journalPosts.id, journalIds));
    for (const row of rows) {
      map.set(key("journal_post", row.id), {
        type: "journal_post",
        id: row.id,
        title: row.title,
        subtitle: row.category,
        href: `/journal/${row.slug}`,
        ctaLabel: "Read",
      });
    }
  }

  return map;
}

export async function resolvePostContext(type: PostContextType, id: string): Promise<PostContextCard | null> {
  const map = await resolvePostContexts([{ type, id }]);
  return map.get(key(type, id)) ?? null;
}

export type SuggestedAttachment = { type: PostContextType; id: string; label: string };

/** One-tap composer suggestions — the traveller's own last 48h of real
 * activity (bookings, RSVPs, perk claims), deduped, most recent first. This
 * is the primary tagging path; search/@mention is the fallback. */
export async function getSuggestedAttachments(travellerId: string, limit = 3): Promise<SuggestedAttachment[]> {
  const since = new Date(Date.now() - SUGGESTION_WINDOW_MS);
  const seen = new Set<string>();
  const suggestions: SuggestedAttachment[] = [];

  function add(type: PostContextType, id: string, label: string) {
    const k = key(type, id);
    if (seen.has(k)) return;
    seen.add(k);
    suggestions.push({ type, id, label });
  }

  const [bookingRows, rsvpRows, claimRows] = await Promise.all([
    db
      .select({ listing: listings, event: events, createdAt: bookings.createdAt })
      .from(bookings)
      .leftJoin(listings, eq(listings.id, bookings.listingId))
      .leftJoin(events, eq(events.id, bookings.eventId))
      .where(
        and(
          eq(bookings.travellerId, travellerId),
          or(eq(bookings.status, "confirmed"), eq(bookings.status, "completed")),
          gte(bookings.createdAt, since),
        ),
      )
      .orderBy(desc(bookings.createdAt))
      .limit(10),
    db
      .select({ event: events, createdAt: eventAttendance.createdAt })
      .from(eventAttendance)
      .innerJoin(events, eq(events.id, eventAttendance.eventId))
      .where(
        and(
          eq(eventAttendance.travellerId, travellerId),
          eq(eventAttendance.status, "going"),
          gte(eventAttendance.createdAt, since),
        ),
      )
      .orderBy(desc(eventAttendance.createdAt))
      .limit(10),
    db
      .select({ promo: promoCodes, claimedAt: dealClaims.claimedAt })
      .from(dealClaims)
      .innerJoin(promoCodes, eq(promoCodes.id, dealClaims.promoCodeId))
      .where(and(eq(dealClaims.travellerId, travellerId), gte(dealClaims.claimedAt, since)))
      .orderBy(desc(dealClaims.claimedAt))
      .limit(10),
  ]);

  type Timestamped = { at: Date; apply: () => void };
  const combined: Timestamped[] = [];
  for (const row of bookingRows) {
    if (row.event) combined.push({ at: row.createdAt, apply: () => add("event", row.event!.id, row.event!.title) });
    else if (row.listing)
      combined.push({ at: row.createdAt, apply: () => add("listing", row.listing!.id, row.listing!.title) });
  }
  for (const row of rsvpRows) {
    combined.push({ at: row.createdAt, apply: () => add("event", row.event.id, row.event.title) });
  }
  for (const row of claimRows) {
    combined.push({ at: row.claimedAt, apply: () => add("perk", row.promo.id, row.promo.title) });
  }
  combined.sort((a, b) => b.at.getTime() - a.at.getTime());
  for (const item of combined) {
    if (suggestions.length >= limit) break;
    item.apply();
  }

  return suggestions.slice(0, limit);
}

/** @mention fallback search across listings, events, and clubs. */
export async function searchMentionables(query: string, limit = 6): Promise<SuggestedAttachment[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const pattern = `%${q}%`;

  const [listingRows, eventRows, clubRows] = await Promise.all([
    db
      .select({ id: listings.id, title: listings.title })
      .from(listings)
      .innerJoin(vendorProfiles, eq(vendorProfiles.id, listings.vendorProfileId))
      .where(and(ilike(listings.title, pattern), ...listingPublishConditions))
      .limit(limit),
    db.select({ id: events.id, title: events.title }).from(events).where(and(eq(events.active, true), ilike(events.title, pattern))).limit(limit),
    db.select({ id: clubs.id, name: clubs.name }).from(clubs).where(and(eq(clubs.status, "approved"), ilike(clubs.name, pattern))).limit(limit),
  ]);

  const results: SuggestedAttachment[] = [
    ...listingRows.map((r) => ({ type: "listing" as const, id: r.id, label: r.title })),
    ...eventRows.map((r) => ({ type: "event" as const, id: r.id, label: r.title })),
    ...clubRows.map((r) => ({ type: "club" as const, id: r.id, label: r.name })),
  ];
  return results.slice(0, limit);
}
