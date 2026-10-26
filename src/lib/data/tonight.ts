import { and, asc, desc, eq, gt, gte, inArray, isNull, lt, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { events, listings, rewards, vendorProfiles } from "@/db/schema";
import { withRlsContext, type DbOrTx } from "@/lib/db-context";
import { kampalaDayBounds, kampalaUpcomingWeekend } from "@/lib/kampala-time";
import { listingPublishConditions } from "@/lib/listing-publish";
import {
  assembleTonight,
  TONIGHT_LIMIT,
  TONIGHT_MAX_PERKS,
  type TonightEvent,
  type TonightJourney,
  type TonightPerk,
} from "@/lib/tonight";

function toTonightEvent(row: { event: typeof events.$inferSelect; organizer: { businessName: string } | null }): TonightEvent {
  return {
    id: row.event.id,
    title: row.event.title,
    startAt: new Date(row.event.startAt),
    location: row.event.location,
    organizerName: row.organizer?.businessName ?? null,
    isWeeklyRegular: row.event.seriesId !== null,
  };
}

/** Events still worth going to today (Kampala day): not started yet, or
 * started but with an end time still ahead. */
async function getTodayEvents(now: Date, limit: number): Promise<TonightEvent[]> {
  const { start, end } = kampalaDayBounds(now);
  const rows = await db
    .select({ event: events, organizer: { businessName: vendorProfiles.businessName } })
    .from(events)
    .leftJoin(vendorProfiles, eq(events.organizerVendorProfileId, vendorProfiles.id))
    .where(
      and(
        eq(events.active, true),
        gte(events.startAt, start),
        lt(events.startAt, end),
        or(gte(events.startAt, now), gt(events.endAt, now))!,
      ),
    )
    .orderBy(asc(events.startAt))
    .limit(limit);
  return rows.map(toTonightEvent);
}

async function getWeekendEvents(now: Date, limit: number): Promise<TonightEvent[]> {
  const { start, end } = kampalaUpcomingWeekend(now);
  if (start >= end) return [];
  const rows = await db
    .select({ event: events, organizer: { businessName: vendorProfiles.businessName } })
    .from(events)
    .leftJoin(vendorProfiles, eq(events.organizerVendorProfileId, vendorProfiles.id))
    .where(and(eq(events.active, true), gte(events.startAt, start), lt(events.startAt, end)))
    .orderBy(asc(events.startAt))
    .limit(limit);
  return rows.map(toTonightEvent);
}

/** Passport perks a member can claim right now at a visible listing — the
 * same self-claimable sources a listing page shows (campaign, manual). */
async function getLivePerks(now: Date, limit: number): Promise<TonightPerk[]> {
  // rewards is under row-level security that requires a role to be set
  // (see manual_rls_round_b.sql). This is a read of the public perk
  // catalog, so a bare traveller context is enough, signed in or not.
  return withRlsContext({ role: "traveller" }, (tx) => readLivePerks(tx, now, limit));
}

async function readLivePerks(client: DbOrTx, now: Date, limit: number): Promise<TonightPerk[]> {
  const rows = await client
    .select({
      rewardId: rewards.id,
      title: rewards.title,
      listingId: listings.id,
      listingTitle: listings.title,
      vendorName: vendorProfiles.businessName,
    })
    .from(rewards)
    .innerJoin(listings, eq(rewards.targetId, listings.id))
    .innerJoin(vendorProfiles, eq(listings.vendorProfileId, vendorProfiles.id))
    .where(
      and(
        eq(rewards.targetType, "listing"),
        eq(rewards.active, true),
        eq(rewards.status, "active"),
        inArray(rewards.source, ["campaign", "manual"]),
        or(isNull(rewards.startsAt), lte(rewards.startsAt, now))!,
        or(isNull(rewards.endsAt), gt(rewards.endsAt, now))!,
        eq(vendorProfiles.accreditationStatus, "trusted"),
        ...listingPublishConditions,
      ),
    )
    .orderBy(desc(rewards.createdAt))
    .limit(limit);
  return rows;
}

/** The home page's "Kampala, today" cards — never empty while there is any
 * event, perk or journey in the system. `journey` comes from the caller,
 * which already loads the journey list. */
export async function getTonightFeed(journey: TonightJourney | null, now = new Date()) {
  const [today, perks, weekend] = await Promise.all([
    getTodayEvents(now, TONIGHT_LIMIT),
    getLivePerks(now, TONIGHT_MAX_PERKS),
    getWeekendEvents(now, TONIGHT_LIMIT),
  ]);
  return assembleTonight({ today, perks, weekend, journey });
}
