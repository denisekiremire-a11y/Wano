"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { journeys, journeyStops, supplyLeads } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { journeyHasCostRange } from "@/lib/data/journeys";
import type { ActionState } from "@/lib/validation";

const optionalInt = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? Number.parseInt(v, 10) : null));

const journeyDetailsSchema = z.object({
  region: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(200).optional().or(z.literal("")),
  durationDays: optionalInt,
  budgetBand: z.enum(["budget", "mid", "premium"]).optional().or(z.literal("")),
  estCostMinMinor: optionalInt,
  estCostMaxMinor: optionalInt,
  currency: z.string().min(1).max(10).default("UGX"),
  bestSeason: z.string().max(200).optional().or(z.literal("")),
  difficulty: z.string().max(100).optional().or(z.literal("")),
  isFeatured: z.coerce.boolean().optional(),
});

export async function updateJourneyDetailsAction(
  journeyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("admin");
  const parsed = journeyDetailsSchema.safeParse({
    region: formData.get("region") ?? "",
    city: formData.get("city") ?? "",
    durationDays: formData.get("durationDays") ?? "",
    budgetBand: formData.get("budgetBand") ?? "",
    estCostMinMinor: formData.get("estCostMinMinor") ?? "",
    estCostMaxMinor: formData.get("estCostMaxMinor") ?? "",
    currency: formData.get("currency") || "UGX",
    bestSeason: formData.get("bestSeason") ?? "",
    difficulty: formData.get("difficulty") ?? "",
    isFeatured: formData.get("isFeatured") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the journey details." };

  await db
    .update(journeys)
    .set({
      region: parsed.data.region || null,
      city: parsed.data.city || null,
      durationDays: parsed.data.durationDays,
      budgetBand: parsed.data.budgetBand || null,
      estCostMinMinor: parsed.data.estCostMinMinor,
      estCostMaxMinor: parsed.data.estCostMaxMinor,
      currency: parsed.data.currency,
      bestSeason: parsed.data.bestSeason || null,
      difficulty: parsed.data.difficulty || null,
      isFeatured: parsed.data.isFeatured ?? false,
    })
    .where(eq(journeys.id, journeyId));

  revalidatePath(`/admin/journeys/${journeyId}`);
  revalidatePath("/admin/journeys");
  revalidatePath("/journeys");
  return {};
}

/** Publishing requires a real cost range and at least one stop — "what does
 * this cost" is the question the main brief says locals ask first. */
export async function publishJourneyAction(journeyId: string): Promise<ActionState> {
  await requireRole("admin");
  const [journey] = await db.select().from(journeys).where(eq(journeys.id, journeyId)).limit(1);
  if (!journey) return { error: "Journey not found." };
  if (!journeyHasCostRange(journey)) {
    return { error: "Set a cost range before publishing." };
  }
  const stops = await db.select({ id: journeyStops.id }).from(journeyStops).where(eq(journeyStops.journeyId, journeyId)).limit(1);
  if (stops.length === 0) return { error: "Add at least one stop before publishing." };

  await db
    .update(journeys)
    .set({ status: "published", publishedAt: journey.publishedAt ?? new Date() })
    .where(eq(journeys.id, journeyId));

  revalidatePath(`/admin/journeys/${journeyId}`);
  revalidatePath("/admin/journeys");
  revalidatePath("/journeys");
  revalidatePath(`/journeys/${journey.slug}`);
  return {};
}

export async function unpublishJourneyAction(journeyId: string) {
  await requireRole("admin");
  const [journey] = await db.select().from(journeys).where(eq(journeys.id, journeyId)).limit(1);
  if (!journey) return;

  await db.update(journeys).set({ status: "unlisted" }).where(eq(journeys.id, journeyId));

  revalidatePath(`/admin/journeys/${journeyId}`);
  revalidatePath("/admin/journeys");
  revalidatePath("/journeys");
  revalidatePath(`/journeys/${journey.slug}`);
}

const stopSchema = z.object({
  dayNumber: z.coerce.number().int().min(1),
  orderIndex: z.coerce.number().int().min(0).default(0),
  listingId: z.string().uuid().optional().or(z.literal("")),
  eventId: z.string().uuid().optional().or(z.literal("")),
  customName: z.string().max(200).optional().or(z.literal("")),
  customAddress: z.string().max(300).optional().or(z.literal("")),
  note: z.string().max(500).optional().or(z.literal("")),
  durationMinutes: optionalInt,
  estCostMinor: optionalInt,
  stopType: z.enum(["stay", "do", "eat", "move", "rest"]).default("do"),
});

async function upsertSupplyLead(stopId: string, customName: string, customAddress: string | null) {
  const [existing] = await db.select().from(supplyLeads).where(eq(supplyLeads.journeyStopId, stopId)).limit(1);
  if (existing) {
    await db.update(supplyLeads).set({ customName, customAddress }).where(eq(supplyLeads.id, existing.id));
  } else {
    await db.insert(supplyLeads).values({ journeyStopId: stopId, customName, customAddress });
  }
}

export async function addStopAction(journeyId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = stopSchema.safeParse({
    dayNumber: formData.get("dayNumber"),
    orderIndex: formData.get("orderIndex") ?? "0",
    listingId: formData.get("listingId") ?? "",
    eventId: formData.get("eventId") ?? "",
    customName: formData.get("customName") ?? "",
    customAddress: formData.get("customAddress") ?? "",
    note: formData.get("note") ?? "",
    durationMinutes: formData.get("durationMinutes") ?? "",
    estCostMinor: formData.get("estCostMinor") ?? "",
    stopType: formData.get("stopType") || "do",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the stop details." };
  if (!parsed.data.listingId && !parsed.data.eventId && !parsed.data.customName) {
    return { error: "Pick a listing/event, or name a custom place." };
  }

  const [stop] = await db
    .insert(journeyStops)
    .values({
      journeyId,
      dayNumber: parsed.data.dayNumber,
      orderIndex: parsed.data.orderIndex,
      listingId: parsed.data.listingId || null,
      eventId: parsed.data.eventId || null,
      customName: parsed.data.customName || null,
      customAddress: parsed.data.customAddress || null,
      note: parsed.data.note || null,
      durationMinutes: parsed.data.durationMinutes,
      estCostMinor: parsed.data.estCostMinor,
      stopType: parsed.data.stopType,
    })
    .returning();

  // A custom stop with no matching listing/event is a real place someone
  // will want to book that Wano doesn't sell yet — hand it to ops.
  if (!parsed.data.listingId && !parsed.data.eventId && parsed.data.customName) {
    await upsertSupplyLead(stop.id, parsed.data.customName, parsed.data.customAddress || null);
  }

  revalidatePath(`/admin/journeys/${journeyId}`);
  revalidatePath("/admin/supply-leads");
  return {};
}

export async function deleteStopAction(journeyId: string, stopId: string) {
  await requireRole("admin");
  await db.delete(journeyStops).where(eq(journeyStops.id, stopId));
  revalidatePath(`/admin/journeys/${journeyId}`);
  revalidatePath("/admin/supply-leads");
}

export async function updateSupplyLeadStatusAction(
  leadId: string,
  status: "open" | "contacted" | "listed" | "dismissed",
) {
  await requireRole("admin");
  await db.update(supplyLeads).set({ status }).where(eq(supplyLeads.id, leadId));
  revalidatePath("/admin/supply-leads");
}
