"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { eventAttendance, events } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { generateClubMeetupItem } from "@/lib/feed-generators";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import type { ActionState } from "@/lib/validation";

export type AttendanceStatus = "going" | "interested" | "maybe";

const eventSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().min(5).max(1000),
  category: z.string().min(1).max(60),
  startAt: z.string().min(1),
  location: z.string().min(2).max(200),
  priceHint: z.string().max(60).optional().or(z.literal("")),
  clubId: z.string().uuid().optional().or(z.literal("")),
});

/** Admin creating an event — including a club's recurring meetup, which is
 * just an event with clubId set. There's no separate meetup system. */
export async function createEventAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");

  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    startAt: formData.get("startAt"),
    location: formData.get("location"),
    priceHint: formData.get("priceHint") ?? "",
    clubId: formData.get("clubId") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the event fields." };

  const startAt = new Date(parsed.data.startAt);
  if (Number.isNaN(startAt.getTime()) || startAt <= new Date()) {
    return { error: "Pick a date and time in the future." };
  }

  const [created] = await db
    .insert(events)
    .values({
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      startAt,
      location: parsed.data.location,
      priceHint: parsed.data.priceHint || null,
      clubId: parsed.data.clubId || null,
    })
    .returning();

  if (created.clubId) await generateClubMeetupItem(created.id);

  revalidatePath("/events");
  revalidatePath("/admin/clubs");
  if (parsed.data.clubId) revalidatePath(`/social/clubs/${parsed.data.clubId}`);
  return {};
}

export async function setAttendanceAction(eventId: string, status: AttendanceStatus) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) throw new Error("Traveller profile not found.");

  const [existing] = await db
    .select()
    .from(eventAttendance)
    .where(and(eq(eventAttendance.eventId, eventId), eq(eventAttendance.travellerId, travellerProfile.id)))
    .limit(1);

  if (existing) {
    if (existing.status === status) {
      await db.delete(eventAttendance).where(eq(eventAttendance.id, existing.id));
    } else {
      await db.update(eventAttendance).set({ status }).where(eq(eventAttendance.id, existing.id));
    }
  } else {
    await db.insert(eventAttendance).values({ eventId, travellerId: travellerProfile.id, status });
  }

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
}
