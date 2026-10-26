"use server";

import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { events, listings, plans } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { newInviteToken, PLAN_STATUSES, setPlanStatus, type PlanStatus } from "@/lib/data/plans";
import { GROUP_PLAN_COOKIE, GROUP_PLAN_COOKIE_MAX_AGE } from "@/lib/group-plan-cookie";
import { parseKampalaLocal } from "@/lib/kampala-time";

async function me() {
  const session = await requireRole("traveller");
  const traveller = await getTravellerProfileByUserId(session.userId);
  if (!traveller) throw new Error("Traveller profile not found.");
  return traveller;
}

export async function createPlanAction(_prev: { error?: string } | undefined, formData: FormData) {
  const traveller = await me();
  const listingId = String(formData.get("listingId") ?? "") || null;
  const eventId = String(formData.get("eventId") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || null;
  let title = String(formData.get("title") ?? "").trim().slice(0, 80);

  let startsAt: Date | null = null;
  if (eventId) {
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) return { error: "That event isn't available any more." };
    startsAt = event.startAt;
    title ||= event.title;
  } else {
    startsAt = parseKampalaLocal(`${formData.get("date")}T${formData.get("time")}`);
    if (!startsAt) return { error: "Pick a day and time." };
    if (listingId) {
      const [listing] = await db.select({ title: listings.title }).from(listings).where(eq(listings.id, listingId)).limit(1);
      if (!listing) return { error: "That place isn't available any more." };
      title ||= listing.title;
    }
  }
  if (!title) return { error: "Give the plan a name." };
  if (startsAt.getTime() < Date.now() - 60 * 60 * 1000) return { error: "That time has already passed." };

  const [plan] = await db
    .insert(plans)
    .values({ creatorId: traveller.id, title, listingId, eventId, startsAt, note, inviteToken: newInviteToken() })
    .returning();
  await setPlanStatus(plan.id, traveller.id, "going");
  redirect(`/plans/${plan.id}`);
}

/** Going / maybe / no, by anyone holding the plan's invite link. */
export async function respondToPlanAction(token: string, status: PlanStatus) {
  if (!PLAN_STATUSES.includes(status)) throw new Error("Unknown answer.");
  const traveller = await me();
  const [plan] = await db.select().from(plans).where(eq(plans.inviteToken, token)).limit(1);
  if (!plan || plan.cancelledAt) throw new Error("This plan was called off.");
  await setPlanStatus(plan.id, traveller.id, status);
  revalidatePath(`/plans/${plan.id}`);
  revalidatePath("/plans");
  return { planId: plan.id };
}

export async function cancelPlanAction(planId: string) {
  const traveller = await me();
  await db
    .update(plans)
    .set({ cancelledAt: new Date() })
    .where(and(eq(plans.id, planId), eq(plans.creatorId, traveller.id)));
  revalidatePath("/plans");
  redirect("/plans");
}

/** The maker books for everyone going: remembers the plan for an hour and
 * opens the place's booking page. Seats come from the venue's allocation
 * as usual, and everyone still pays at the venue. */
export async function startGroupBookingAction(planId: string) {
  const traveller = await me();
  const [plan] = await db.select().from(plans).where(eq(plans.id, planId)).limit(1);
  if (!plan || plan.creatorId !== traveller.id || plan.cancelledAt || plan.bookingId) {
    throw new Error("Only the person who made the plan can book for the group.");
  }
  const target = plan.listingId ? `/explore/${plan.listingId}` : plan.eventId ? `/events/${plan.eventId}` : null;
  if (!target) throw new Error("This plan has no place to book.");
  (await cookies()).set(GROUP_PLAN_COOKIE, plan.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GROUP_PLAN_COOKIE_MAX_AGE,
  });
  redirect(`${target}?group=1`);
}
