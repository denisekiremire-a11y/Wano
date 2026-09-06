"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { listingImages, listings, vendorSubmissions } from "@/db/schema";
import { parseListingContentFromFormData } from "@/lib/actions/listing-shared";
import { requireRole } from "@/lib/auth";
import { getPendingEditSubmission } from "@/lib/data/submissions";
import { getVendorOwnListingFull, getVendorProfileByUserId } from "@/lib/data/vendor";
import { notifyAdmin } from "@/lib/notify";
import type { ActionState } from "@/lib/validation";

const MAX_LISTING_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_LISTING_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function requireOwnListing(vendorUserId: string, listingId: string) {
  const vendorProfile = await getVendorProfileByUserId(vendorUserId);
  if (!vendorProfile) return null;
  const listingRow = await getVendorOwnListingFull(vendorProfile.id, listingId);
  if (!listingRow) return null;
  return listingRow.listing.id;
}

/** Creates a new listing proposal, or an edit to one of the vendor's own
 * existing listings — either way it lands as a pending vendorSubmission
 * for admin review rather than touching the live listing directly. An edit
 * resubmission folds into any existing pending row for the same listing
 * instead of piling up duplicates. */
export async function submitListingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return { error: "Vendor profile not found." };

  const listingId = String(formData.get("listingId") ?? "") || null;
  if (listingId) {
    const owned = await getVendorOwnListingFull(vendorProfile.id, listingId);
    if (!owned) return { error: "You can only edit your own listings." };
  }

  const parsed = parseListingContentFromFormData(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the listing fields." };
  const payload = parsed.data as unknown as Record<string, unknown>;

  if (listingId) {
    const existing = await getPendingEditSubmission(vendorProfile.id, "listing", listingId);
    if (existing) {
      await db
        .update(vendorSubmissions)
        .set({ payload, status: "pending", reviewNotes: null, updatedAt: new Date() })
        .where(eq(vendorSubmissions.id, existing.id));
    } else {
      await db
        .insert(vendorSubmissions)
        .values({ vendorProfileId: vendorProfile.id, entityType: "listing", entityId: listingId, payload });
    }
  } else {
    await db
      .insert(vendorSubmissions)
      .values({ vendorProfileId: vendorProfile.id, entityType: "listing", entityId: null, payload });
  }

  await notifyAdmin("New vendor listing submission", [
    `<strong>${vendorProfile.businessName}</strong> submitted ${listingId ? "an edit to" : "a new listing:"} "${parsed.data.title}" for review.`,
  ]);

  revalidatePath("/vendor/dashboard/listings");
  revalidatePath("/admin/submissions");
  return {};
}

export async function withdrawListingSubmissionAction(submissionId: string) {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) throw new Error("Vendor profile not found.");

  const [row] = await db.select().from(vendorSubmissions).where(eq(vendorSubmissions.id, submissionId)).limit(1);
  if (!row || row.vendorProfileId !== vendorProfile.id || row.status !== "pending") {
    throw new Error("Submission not found.");
  }
  await db.delete(vendorSubmissions).where(eq(vendorSubmissions.id, submissionId));
  revalidatePath("/vendor/dashboard/listings");
}

/** The vendor's own pause/resume switch — independent of content
 * moderation, same as it's always been (see listings.active). */
export async function setListingActiveAction(listingId: string, active: boolean) {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) throw new Error("Vendor profile not found.");
  const owned = await getVendorOwnListingFull(vendorProfile.id, listingId);
  if (!owned) throw new Error("You can only edit your own listings.");

  await db.update(listings).set({ active }).where(eq(listings.id, listingId));
  revalidatePath("/vendor/dashboard/listings");
  revalidatePath(`/explore/${listingId}`);
  revalidatePath("/explore");
}

export async function uploadListingPhotosAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("vendor");
  const listingId = await requireOwnListing(session.userId, String(formData.get("listingId") ?? ""));
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

  revalidatePath("/vendor/dashboard/listings");
  revalidatePath("/explore");
  revalidatePath(`/explore/${listingId}`);
  revalidatePath("/journeys");
  revalidatePath("/partners");
  revalidatePath("/");

  return {};
}

export async function deleteOwnListingImageAction(imageId: string) {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) throw new Error("Vendor profile not found.");

  const [image] = await db
    .select({ id: listingImages.id, listingId: listingImages.listingId, vendorProfileId: listings.vendorProfileId })
    .from(listingImages)
    .innerJoin(listings, eq(listings.id, listingImages.listingId))
    .where(eq(listingImages.id, imageId))
    .limit(1);
  if (!image || image.vendorProfileId !== vendorProfile.id) {
    throw new Error("You can only remove photos on your own listing.");
  }

  await db.delete(listingImages).where(eq(listingImages.id, imageId));

  revalidatePath("/vendor/dashboard/listings");
  revalidatePath("/explore");
  revalidatePath(`/explore/${image.listingId}`);
  revalidatePath("/journeys");
  revalidatePath("/partners");
  revalidatePath("/");
}
