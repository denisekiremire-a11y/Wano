"use server";

import { and, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { eventAttendance, events } from "@/db/schema";
import { requireAdminLevel, requireAdminPage, requireRole } from "@/lib/auth";
import { logAdminAction } from "@/lib/admin-action-log";
import { generateClubMeetupItem } from "@/lib/feed-generators";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { parseKampalaLocal, weeklyOccurrences } from "@/lib/kampala-time";
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
  const session = await requireAdminLevel("super"); // Match Day / Wano XP event creation

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
  await logAdminAction(session.userId, "event.created", `Created event "${parsed.data.title}"`, {
    type: "event",
    id: created.id,
  });

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

const MAX_WEEKLY_OCCURRENCES = 12;

const listedEventSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().min(5).max(1000),
  category: z.string().min(1).max(60),
  startAt: z.string().min(1),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .or(z.literal("")),
  location: z.string().min(2).max(200),
  priceHint: z.string().max(60).optional().or(z.literal("")),
  organizerVendorProfileId: z.string().uuid().optional().or(z.literal("")),
  weeks: z.coerce.number().int().min(1).max(MAX_WEEKLY_OCCURRENCES),
  priceFrom: z.union([z.literal(""), z.coerce.number().int().min(0).max(100_000_000)]),
  setting: z.enum(["", "indoors", "outdoors"]),
});

/** Admin listing an event for the home page and Events tab — either a
 * one-off (weeks = 1) or a weekly regular such as a quiz night (weeks > 1),
 * which becomes one event row per week sharing a seriesId. Times are
 * entered and stored as Kampala time. An event with no organiser shows as
 * a "Wano pick" (a public event Wano recommends, not a partner). */
export async function createListedEventAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdminPage("/admin/events");

  const parsed = listedEventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    startAt: formData.get("startAt"),
    endTime: formData.get("endTime") ?? "",
    location: formData.get("location"),
    priceHint: formData.get("priceHint") ?? "",
    organizerVendorProfileId: formData.get("organizerVendorProfileId") ?? "",
    weeks: formData.get("weeks") ?? 1,
    priceFrom: formData.get("priceFrom") ?? "",
    setting: formData.get("setting") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the event fields." };

  const first = parseKampalaLocal(parsed.data.startAt);
  if (!first || first <= new Date()) return { error: "Pick a date and time in the future." };

  // Optional end time on the same evening (or past midnight, if earlier
  // than the start) — lets "still on tonight" include events in progress.
  let durationMs: number | null = null;
  if (parsed.data.endTime) {
    const [h, m] = parsed.data.endTime.split(":").map(Number);
    const [sh, sm] = parsed.data.startAt.slice(11, 16).split(":").map(Number);
    let minutes = h * 60 + m - (sh * 60 + sm);
    if (minutes <= 0) minutes += 24 * 60;
    durationMs = minutes * 60 * 1000;
  }

  const seriesId = parsed.data.weeks > 1 ? crypto.randomUUID() : null;
  const rows = weeklyOccurrences(first, parsed.data.weeks).map((startAt) => ({
    title: parsed.data.title,
    description: parsed.data.description,
    category: parsed.data.category,
    startAt,
    endAt: durationMs ? new Date(startAt.getTime() + durationMs) : null,
    location: parsed.data.location,
    priceHint: parsed.data.priceHint || null,
    organizerVendorProfileId: parsed.data.organizerVendorProfileId || null,
    seriesId,
    priceFromMinor: parsed.data.priceFrom === "" ? null : parsed.data.priceFrom,
    indoors: parsed.data.setting === "" ? null : parsed.data.setting === "indoors",
  }));

  const created = await db.insert(events).values(rows).returning({ id: events.id });
  await logAdminAction(
    session.userId,
    "event.created",
    seriesId
      ? `Created weekly event "${parsed.data.title}" (${rows.length} weeks)`
      : `Created event "${parsed.data.title}"`,
    { type: "event", id: created[0].id },
  );

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/admin/events");
  return {};
}

/** Ends a weekly regular: every future date in the series is hidden. Past
 * dates stay as they were (attendance, tickets and history keep working). */
export async function endEventSeriesAction(seriesId: string) {
  const session = await requireAdminPage("/admin/events");
  const parsedId = z.string().uuid().safeParse(seriesId);
  if (!parsedId.success) throw new Error("Invalid series.");

  const ended = await db
    .update(events)
    .set({ active: false })
    .where(and(eq(events.seriesId, parsedId.data), gt(events.startAt, new Date()), eq(events.active, true)))
    .returning({ id: events.id });

  await logAdminAction(session.userId, "event.series_ended", `Ended a weekly event (${ended.length} future dates hidden)`, {
    type: "event",
    id: ended[0]?.id ?? parsedId.data,
  });

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath("/admin/events");
}
