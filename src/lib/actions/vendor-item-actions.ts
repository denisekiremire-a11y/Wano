"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { events, listingItemImages, listingItems, listings } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getVendorOwnListingFull, getVendorProfileByUserId } from "@/lib/data/vendor";
import type { ActionState } from "@/lib/validation";

const MAX_ITEM_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_ITEM_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function requireOwnListing(vendorUserId: string, listingId: string) {
  const vendorProfile = await getVendorProfileByUserId(vendorUserId);
  if (!vendorProfile) return null;
  const listingRow = await getVendorOwnListingFull(vendorProfile.id, listingId);
  if (!listingRow) return null;
  return listingRow.listing.id;
}

async function requireOwnEvent(vendorUserId: string, eventId: string) {
  const vendorProfile = await getVendorProfileByUserId(vendorUserId);
  if (!vendorProfile) return null;
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event || event.organizerVendorProfileId !== vendorProfile.id) return null;
  return event.id;
}

/** Where an item belongs — a listing's menu/services/rooms/vehicles, or a
 * standalone event's ticket tiers. Exactly one of listingId/eventId is set
 * on the item itself; this resolves which and checks the caller owns it. */
async function requireOwnItem(vendorUserId: string, itemId: string) {
  const vendorProfile = await getVendorProfileByUserId(vendorUserId);
  if (!vendorProfile) return null;
  const [row] = await db
    .select({
      item: listingItems,
      listingVendorProfileId: listings.vendorProfileId,
      eventOrganizerVendorProfileId: events.organizerVendorProfileId,
    })
    .from(listingItems)
    .leftJoin(listings, eq(listings.id, listingItems.listingId))
    .leftJoin(events, eq(events.id, listingItems.eventId))
    .where(eq(listingItems.id, itemId))
    .limit(1);
  if (!row) return null;
  const ownerId = row.listingVendorProfileId ?? row.eventOrganizerVendorProfileId;
  if (ownerId !== vendorProfile.id) return null;
  return row.item;
}

function revalidateItemPaths(item: { listingId: string | null; eventId: string | null }) {
  if (item.listingId) {
    revalidatePath(`/vendor/dashboard/listings/${item.listingId}/items`);
    revalidatePath(`/explore/${item.listingId}`);
  }
  if (item.eventId) {
    revalidatePath(`/vendor/dashboard/events/${item.eventId}/items`);
    revalidatePath(`/events/${item.eventId}`);
  }
}

function parseItemFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give this item a name." } as const;

  // priceMinor is the raw UGX integer (no minor-unit multiplication — UGX
  // has no minor subunit in practice, same convention as listings.priceMinor).
  const priceRaw = String(formData.get("priceMinor") ?? "").trim();
  const priceMinor = priceRaw ? Number(priceRaw) : null;
  if (priceRaw && (!Number.isFinite(priceMinor) || priceMinor! < 0)) {
    return { error: "Price must be a positive number." } as const;
  }

  return {
    data: {
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      sectionLabel: String(formData.get("sectionLabel") ?? "").trim() || null,
      priceMinor: priceMinor !== null ? Math.round(priceMinor) : null,
      priceUnit: String(formData.get("priceUnit") ?? "").trim() || null,
      durationText: String(formData.get("durationText") ?? "").trim() || null,
      capacityText: String(formData.get("capacityText") ?? "").trim() || null,
    },
  } as const;
}

// Items are supplementary content, same class as photos (not the core
// title/type/price identity gated by submitListingAction's admin-review
// queue) — vendors/organizers can add/edit/delete them directly, no
// moderation step, consistent with uploadListingPhotosAction.
export async function createListingItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("vendor");
  const rawEventId = String(formData.get("eventId") ?? "");
  const rawListingId = String(formData.get("listingId") ?? "");

  let listingId: string | null = null;
  let eventId: string | null = null;
  if (rawEventId) {
    eventId = await requireOwnEvent(session.userId, rawEventId);
    if (!eventId) return { error: "You don't organize this event." };
  } else {
    listingId = await requireOwnListing(session.userId, rawListingId);
    if (!listingId) return { error: "You don't have a listing yet." };
  }

  const parsed = parseItemFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const existing = await db
    .select({ id: listingItems.id })
    .from(listingItems)
    .where(listingId ? eq(listingItems.listingId, listingId) : eq(listingItems.eventId, eventId!));

  await db.insert(listingItems).values({ listingId, eventId, sortOrder: existing.length, ...parsed.data });

  revalidateItemPaths({ listingId, eventId });
  return {};
}

export async function updateListingItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("vendor");
  const item = await requireOwnItem(session.userId, String(formData.get("itemId") ?? ""));
  if (!item) return { error: "Item not found." };

  const parsed = parseItemFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  await db.update(listingItems).set(parsed.data).where(eq(listingItems.id, item.id));

  revalidateItemPaths(item);
  return {};
}

export async function deleteListingItemAction(itemId: string) {
  const session = await requireRole("vendor");
  const item = await requireOwnItem(session.userId, itemId);
  if (!item) throw new Error("Item not found.");

  await db.delete(listingItems).where(eq(listingItems.id, itemId));

  revalidateItemPaths(item);
}

export async function uploadListingItemPhotosAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("vendor");
  const item = await requireOwnItem(session.userId, String(formData.get("itemId") ?? ""));
  if (!item) return { error: "Item not found." };

  const images = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (images.length === 0) return { error: "Choose at least one photo." };
  for (const file of images) {
    if (file.size > MAX_ITEM_IMAGE_BYTES) return { error: "Each photo must be under 8MB." };
    if (!ALLOWED_ITEM_IMAGE_TYPES.has(file.type)) return { error: "Photos must be JPG, PNG, or WebP." };
  }

  const existing = await db
    .select({ id: listingItemImages.id })
    .from(listingItemImages)
    .where(eq(listingItemImages.itemId, item.id));

  for (let i = 0; i < images.length; i++) {
    const buffer = Buffer.from(await images[i].arrayBuffer());
    await db.insert(listingItemImages).values({
      itemId: item.id,
      data: buffer,
      mimeType: images[i].type,
      sortOrder: existing.length + i,
    });
  }

  revalidateItemPaths(item);
  return {};
}

export async function deleteListingItemImageAction(imageId: string) {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) throw new Error("Vendor profile not found.");

  const [image] = await db
    .select({
      id: listingItemImages.id,
      item: listingItems,
      listingVendorProfileId: listings.vendorProfileId,
      eventOrganizerVendorProfileId: events.organizerVendorProfileId,
    })
    .from(listingItemImages)
    .innerJoin(listingItems, eq(listingItems.id, listingItemImages.itemId))
    .leftJoin(listings, eq(listings.id, listingItems.listingId))
    .leftJoin(events, eq(events.id, listingItems.eventId))
    .where(eq(listingItemImages.id, imageId))
    .limit(1);
  const ownerId = image?.listingVendorProfileId ?? image?.eventOrganizerVendorProfileId;
  if (!image || ownerId !== vendorProfile.id) {
    throw new Error("You can only remove photos on your own item.");
  }

  await db.delete(listingItemImages).where(eq(listingItemImages.id, imageId));

  revalidateItemPaths(image.item);
}
