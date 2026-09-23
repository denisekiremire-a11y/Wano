"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { listingItemImages, listingItems, listings } from "@/db/schema";
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

async function requireOwnItem(vendorUserId: string, itemId: string) {
  const vendorProfile = await getVendorProfileByUserId(vendorUserId);
  if (!vendorProfile) return null;
  const [row] = await db
    .select({ item: listingItems, vendorProfileId: listings.vendorProfileId })
    .from(listingItems)
    .innerJoin(listings, eq(listings.id, listingItems.listingId))
    .where(eq(listingItems.id, itemId))
    .limit(1);
  if (!row || row.vendorProfileId !== vendorProfile.id) return null;
  return row.item;
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

// Items are supplementary listing content, same class as photos (not the
// core title/type/price identity gated by submitListingAction's
// admin-review queue) — vendors can add/edit/delete them directly, no
// moderation step, consistent with uploadListingPhotosAction.
export async function createListingItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("vendor");
  const listingId = await requireOwnListing(session.userId, String(formData.get("listingId") ?? ""));
  if (!listingId) return { error: "You don't have a listing yet." };

  const parsed = parseItemFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const existing = await db
    .select({ id: listingItems.id })
    .from(listingItems)
    .where(eq(listingItems.listingId, listingId));

  await db.insert(listingItems).values({ listingId, sortOrder: existing.length, ...parsed.data });

  revalidatePath(`/vendor/dashboard/listings/${listingId}/items`);
  revalidatePath(`/explore/${listingId}`);
  return {};
}

export async function updateListingItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("vendor");
  const item = await requireOwnItem(session.userId, String(formData.get("itemId") ?? ""));
  if (!item) return { error: "Item not found." };

  const parsed = parseItemFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  await db.update(listingItems).set(parsed.data).where(eq(listingItems.id, item.id));

  revalidatePath(`/vendor/dashboard/listings/${item.listingId}/items`);
  revalidatePath(`/explore/${item.listingId}`);
  return {};
}

export async function deleteListingItemAction(itemId: string) {
  const session = await requireRole("vendor");
  const item = await requireOwnItem(session.userId, itemId);
  if (!item) throw new Error("Item not found.");

  await db.delete(listingItems).where(eq(listingItems.id, itemId));

  revalidatePath(`/vendor/dashboard/listings/${item.listingId}/items`);
  revalidatePath(`/explore/${item.listingId}`);
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

  revalidatePath(`/vendor/dashboard/listings/${item.listingId}/items`);
  revalidatePath(`/explore/${item.listingId}`);
  return {};
}

export async function deleteListingItemImageAction(imageId: string) {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) throw new Error("Vendor profile not found.");

  const [image] = await db
    .select({
      id: listingItemImages.id,
      itemId: listingItemImages.itemId,
      listingId: listingItems.listingId,
      vendorProfileId: listings.vendorProfileId,
    })
    .from(listingItemImages)
    .innerJoin(listingItems, eq(listingItems.id, listingItemImages.itemId))
    .innerJoin(listings, eq(listings.id, listingItems.listingId))
    .where(eq(listingItemImages.id, imageId))
    .limit(1);
  if (!image || image.vendorProfileId !== vendorProfile.id) {
    throw new Error("You can only remove photos on your own listing.");
  }

  await db.delete(listingItemImages).where(eq(listingItemImages.id, imageId));

  revalidatePath(`/vendor/dashboard/listings/${image.listingId}/items`);
  revalidatePath(`/explore/${image.listingId}`);
}
