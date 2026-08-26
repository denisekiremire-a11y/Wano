"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { eventAttendance } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";

export type AttendanceStatus = "going" | "interested" | "maybe";

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
