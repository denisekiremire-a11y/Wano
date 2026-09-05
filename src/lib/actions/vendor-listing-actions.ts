"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { listingImages } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getVendorListingFull, getVendorProfileByUserId } from "@/lib/data/vendor";
import type { ActionState } from "@/lib/validation";

const MAX_LISTING_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_LISTING_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function requireOwnListing(vendorUserId: string) {
  const vendorProfile = await getVendorProfileByUserId(vendorUserId);
  if (!vendorProfile) return null;
  const listingRow = await getVendorListingFull(vendorProfile.id);
  if (!listingRow) return null;
  return listingRow.listing.id;
}

export async function uploadListingPhotosAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("vendor");
  const listingId = await requireOwnListing(session.userId);
  if (!listingId) return { error: "You don't have a listing yet." };

  const images = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (images.length === 0) return { error: "Choose at least one photo." };
  for (const file of images) {
    if (file.size > MAX_LISTING_IMAGE_BYTES) return { error: "Each photo must be under 8MB." };
    if (!ALLOWED_LISTING_IMAGE_TYPES.has(file.type)) return { error: "Photos must be JPG, PNG, or WebP." };
  }

  const existing = await db
    .select({ id: listingImages.id })
    .from(listingImages)
    .where(eq(listingImages.listingId, listingId));

  for (let i = 0; i < images.length; i++) {
    const buffer = Buffer.from(await images[i].arrayBuffer());
    await db.insert(listingImages).values({
      listingId,
      data: buffer,
      mimeType: images[i].type,
      sortOrder: existing.length + i,
    });
  }

  revalidatePath("/vendor/dashboard");
  revalidatePath("/explore");
  revalidatePath(`/explore/${listingId}`);
  revalidatePath("/journeys");
  revalidatePath("/partners");
  revalidatePath("/");

  return {};
}

export async function deleteOwnListingImageAction(imageId: string) {
  const session = await requireRole("vendor");
  const listingId = await requireOwnListing(session.userId);
  if (!listingId) throw new Error("You don't have a listing yet.");

  const [image] = await db
    .select({ id: listingImages.id, listingId: listingImages.listingId })
    .from(listingImages)
    .where(eq(listingImages.id, imageId))
    .limit(1);
  if (!image || image.listingId !== listingId) {
    throw new Error("You can only remove photos on your own listing.");
  }

  await db.delete(listingImages).where(eq(listingImages.id, imageId));

  revalidatePath("/vendor/dashboard");
  revalidatePath("/explore");
  revalidatePath(`/explore/${listingId}`);
  revalidatePath("/journeys");
  revalidatePath("/partners");
  revalidatePath("/");
}
