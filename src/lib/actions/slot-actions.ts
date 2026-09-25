"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { listings, slots } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getVendorProfileByUserId } from "@/lib/data/vendor";
import type { ActionState } from "@/lib/validation";

const MAX_RECURRING_WEEKS = 26;

function revalidateSlotPaths(listingId: string) {
  revalidatePath(`/vendor/dashboard/listings/${listingId}/slots`);
  revalidatePath(`/admin/slots`);
  revalidatePath(`/explore/${listingId}`);
}

async function requireOwnListing(vendorUserId: string, listingId: string) {
  const vendorProfile = await getVendorProfileByUserId(vendorUserId);
  if (!vendorProfile) return null;
  const [listing] = await db
    .select()
    .from(listings)
    .where(and(eq(listings.id, listingId), eq(listings.vendorProfileId, vendorProfile.id)))
    .limit(1);
  return listing ? { listing, vendorProfileId: vendorProfile.id } : null;
}

function parseSlotFields(formData: FormData) {
  const date = String(formData.get("date") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const capacity = Number(capacityRaw);

  if (!date) return { error: "Pick a date." } as const;
  if (!startTime || !endTime) return { error: "Set a start and end time." } as const;
  if (startTime >= endTime) return { error: "End time must be after start time." } as const;
  if (!Number.isFinite(capacity) || capacity < 1) return { error: "Capacity must be at least 1." } as const;

  return { data: { date, startTime, endTime, capacity: Math.round(capacity) } } as const;
}

async function insertOneOffSlot(vendorProfileId: string, listingId: string, formData: FormData): Promise<ActionState> {
  const parsed = parseSlotFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  await db.insert(slots).values({ vendorId: vendorProfileId, listingId, ...parsed.data });
  revalidateSlotPaths(listingId);
  return {};
}

function parseRecurringFields(formData: FormData) {
  const dayOfWeek = Number(formData.get("dayOfWeek"));
  const startTimesRaw = String(formData.get("startTimes") ?? "");
  const durationMinutes = Number(formData.get("durationMinutes"));
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const capacity = Number(capacityRaw);
  const weeksAheadRaw = String(formData.get("weeksAhead") ?? "12").trim();
  const weeksAhead = Number(weeksAheadRaw) || 12;

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return { error: "Pick a day of the week." } as const;
  }
  const startTimes = startTimesRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (startTimes.length === 0) return { error: "Add at least one start time, e.g. 10:00." } as const;
  if (!Number.isFinite(durationMinutes) || durationMinutes < 15) {
    return { error: "Duration must be at least 15 minutes." } as const;
  }
  if (!Number.isFinite(capacity) || capacity < 1) return { error: "Capacity must be at least 1." } as const;
  if (weeksAhead < 1 || weeksAhead > MAX_RECURRING_WEEKS) {
    return { error: `Generate between 1 and ${MAX_RECURRING_WEEKS} weeks ahead.` } as const;
  }

  return { data: { dayOfWeek, startTimes, durationMinutes: Math.round(durationMinutes), capacity: Math.round(capacity), weeksAhead } } as const;
}

function addMinutesToTime(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor((total % (24 * 60)) / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Expands a "every Saturday 10am/12pm/2pm" request into concrete slot
 * rows for the next weeksAhead occurrences of that weekday — the slots
 * table only ever stores concrete instances (see schema.ts), never an
 * abstract recurrence rule, so this is where the recurrence actually
 * happens, once, at creation time. */
function expandRecurringDates(dayOfWeek: number, weeksAhead: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilFirst = (dayOfWeek - today.getDay() + 7) % 7;
  const first = new Date(today);
  first.setDate(first.getDate() + daysUntilFirst);
  for (let i = 0; i < weeksAhead; i++) {
    const d = new Date(first);
    d.setDate(d.getDate() + i * 7);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

async function insertRecurringSlots(vendorProfileId: string, listingId: string, formData: FormData): Promise<ActionState> {
  const parsed = parseRecurringFields(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { dayOfWeek, startTimes, durationMinutes, capacity, weeksAhead } = parsed.data;

  const dates = expandRecurringDates(dayOfWeek, weeksAhead);
  const rows = dates.flatMap((date) =>
    startTimes.map((startTime) => ({
      vendorId: vendorProfileId,
      listingId,
      date,
      startTime,
      endTime: addMinutesToTime(startTime, durationMinutes),
      capacity,
    })),
  );

  await db.insert(slots).values(rows);
  revalidateSlotPaths(listingId);
  return {};
}

export async function createOneOffSlotAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("vendor");
  const listingId = String(formData.get("listingId") ?? "");
  const owned = await requireOwnListing(session.userId, listingId);
  if (!owned) return { error: "You don't have this listing." };
  return insertOneOffSlot(owned.vendorProfileId, listingId, formData);
}

export async function createRecurringSlotsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("vendor");
  const listingId = String(formData.get("listingId") ?? "");
  const owned = await requireOwnListing(session.userId, listingId);
  if (!owned) return { error: "You don't have this listing." };
  return insertRecurringSlots(owned.vendorProfileId, listingId, formData);
}

export async function toggleSlotBlockedAction(slotId: string, blocked: boolean) {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) throw new Error("Vendor profile not found.");

  const [slot] = await db.select().from(slots).where(eq(slots.id, slotId)).limit(1);
  if (!slot || slot.vendorId !== vendorProfile.id) throw new Error("Slot not found.");

  await db.update(slots).set({ isBlocked: blocked }).where(eq(slots.id, slotId));
  revalidateSlotPaths(slot.listingId);
}

// Admin variants — same insert logic, but authorized by role alone (an
// admin can manage any vendor's slots, e.g. to help one over the phone),
// not by ownership. The listing's own vendorId is still what gets stamped
// onto every slot row, exactly as if that vendor created it themselves.
export async function adminCreateOneOffSlotAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const listingId = String(formData.get("listingId") ?? "");
  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!listing) return { error: "Listing not found." };
  return insertOneOffSlot(listing.vendorProfileId, listingId, formData);
}

export async function adminCreateRecurringSlotsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const listingId = String(formData.get("listingId") ?? "");
  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!listing) return { error: "Listing not found." };
  return insertRecurringSlots(listing.vendorProfileId, listingId, formData);
}

export async function adminToggleSlotBlockedAction(slotId: string, blocked: boolean) {
  await requireRole("admin");
  const [slot] = await db.select().from(slots).where(eq(slots.id, slotId)).limit(1);
  if (!slot) throw new Error("Slot not found.");

  await db.update(slots).set({ isBlocked: blocked }).where(eq(slots.id, slotId));
  revalidateSlotPaths(slot.listingId);
}
