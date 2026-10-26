import { randomBytes } from "crypto";
import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { bookingGuests, events, listings, planMembers, plans, stamps, travellerProfiles } from "@/db/schema";
import type { DbOrTx } from "@/lib/db-context";

export type PlanStatus = "going" | "maybe" | "no";
export const PLAN_STATUSES: PlanStatus[] = ["going", "maybe", "no"];

export function newInviteToken() {
  return randomBytes(9).toString("base64url");
}

/** A plan with its place name and everyone who answered. */
export async function getPlanView(where: { id: string } | { token: string }) {
  const [row] = await db
    .select({ plan: plans, listingTitle: listings.title, eventTitle: events.title, eventLocation: events.location })
    .from(plans)
    .leftJoin(listings, eq(listings.id, plans.listingId))
    .leftJoin(events, eq(events.id, plans.eventId))
    .where("id" in where ? eq(plans.id, where.id) : eq(plans.inviteToken, where.token))
    .limit(1);
  if (!row) return null;
  const members = await db
    .select({ travellerId: planMembers.travellerId, status: planMembers.status, name: travellerProfiles.displayName })
    .from(planMembers)
    .innerJoin(travellerProfiles, eq(travellerProfiles.id, planMembers.travellerId))
    .where(eq(planMembers.planId, row.plan.id))
    .orderBy(asc(planMembers.updatedAt));
  return {
    ...row.plan,
    placeName: row.listingTitle ?? row.eventTitle ?? null,
    placeHref: row.plan.listingId ? `/explore/${row.plan.listingId}` : row.plan.eventId ? `/events/${row.plan.eventId}` : null,
    members: members as { travellerId: string; status: PlanStatus; name: string }[],
  };
}
export type PlanView = NonNullable<Awaited<ReturnType<typeof getPlanView>>>;

/** Plans the member made or answered, soonest first; past ones last. */
export async function getMyPlans(travellerId: string) {
  const mine = await db
    .selectDistinct({ id: plans.id, startsAt: plans.startsAt })
    .from(plans)
    .leftJoin(planMembers, eq(planMembers.planId, plans.id))
    .where(and(isNull(plans.cancelledAt), or(eq(plans.creatorId, travellerId), eq(planMembers.travellerId, travellerId))))
    .orderBy(desc(plans.startsAt))
    .limit(30);
  const views = await Promise.all(mine.map((p) => getPlanView({ id: p.id })));
  const now = Date.now();
  const list = views.filter((v): v is PlanView => v !== null);
  return {
    upcoming: list.filter((p) => p.startsAt.getTime() >= now - 3 * 60 * 60 * 1000).reverse(),
    past: list.filter((p) => p.startsAt.getTime() < now - 3 * 60 * 60 * 1000),
  };
}

export async function setPlanStatus(planId: string, travellerId: string, status: PlanStatus) {
  await db
    .insert(planMembers)
    .values({ planId, travellerId, status })
    .onConflictDoUpdate({
      target: [planMembers.planId, planMembers.travellerId],
      set: { status, updatedAt: new Date() },
    });
}

/** Attaches the plan's "going" friends to the maker's new booking, up to
 * the booking's party size. Only the plan's maker, only for the plan's own
 * place, and only once per plan. Returns how many were attached. */
export async function attachPlanGuests(
  planId: string,
  booking: { id: string; travellerId: string; listingId: string | null; eventId: string | null; partySize: number | null },
) {
  const [plan] = await db.select().from(plans).where(eq(plans.id, planId)).limit(1);
  if (!plan || plan.cancelledAt || plan.bookingId) return 0;
  if (plan.creatorId !== booking.travellerId) return 0;
  const samePlace =
    (plan.listingId && plan.listingId === booking.listingId) || (plan.eventId && plan.eventId === booking.eventId);
  if (!samePlace) return 0;

  const going = await db
    .select({ travellerId: planMembers.travellerId })
    .from(planMembers)
    .where(and(eq(planMembers.planId, plan.id), eq(planMembers.status, "going")))
    .orderBy(asc(planMembers.updatedAt));
  const seats = Math.max(0, (booking.partySize ?? 1) - 1);
  const guests = going.map((g) => g.travellerId).filter((id) => id !== booking.travellerId).slice(0, seats);

  if (guests.length > 0) {
    await db
      .insert(bookingGuests)
      .values(guests.map((travellerId) => ({ bookingId: booking.id, travellerId, planId: plan.id })))
      .onConflictDoNothing();
  }
  await db.update(plans).set({ bookingId: booking.id }).where(eq(plans.id, plan.id));
  return guests.length;
}

/** Journey stamps for a group booking's guests, the same one the booker
 * gets when the booking is confirmed. Call inside the admin RLS context. */
export async function stampBookingGuests(
  tx: DbOrTx,
  booking: { id: string; journeyId: string | null },
) {
  if (!booking.journeyId) return;
  const guests = await tx
    .select({ travellerId: bookingGuests.travellerId })
    .from(bookingGuests)
    .where(eq(bookingGuests.bookingId, booking.id));
  if (guests.length === 0) return;
  const have = await tx
    .select({ travellerId: stamps.travellerId })
    .from(stamps)
    .where(
      and(
        eq(stamps.journeyId, booking.journeyId),
        inArray(
          stamps.travellerId,
          guests.map((g) => g.travellerId),
        ),
      ),
    );
  const stamped = new Set(have.map((h) => h.travellerId));
  const fresh = guests.filter((g) => !stamped.has(g.travellerId));
  if (fresh.length > 0) {
    await tx
      .insert(stamps)
      .values(fresh.map((g) => ({ travellerId: g.travellerId, journeyId: booking.journeyId!, bookingId: booking.id })));
  }
}
