"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { postImages, posts } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { generateVendorPostItem } from "@/lib/feed-generators";
import { getOwningVendorProfileId } from "@/lib/data/rewards";
import { getVendorProfileByUserId } from "@/lib/data/vendor";
import { containsProfanity } from "@/lib/profanity";
import { countInLastHour, RATE_LIMITS } from "@/lib/rate-limit";
import type { ActionState } from "@/lib/validation";

const MAX_IMAGES = 4;

const vendorPostSchema = z.object({
  content: z.string().min(1).max(500),
  listingId: z.string().uuid().optional().or(z.literal("")),
});

/** A vendor's own event/update post — unlike their listings and rewards,
 * this publishes immediately (no approval step): it's their own page
 * announcing something, not a change to catalog content travellers rely
 * on to be accurate. */
export async function createVendorPostAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("vendor");
  const parsed = vendorPostSchema.safeParse({
    content: formData.get("content"),
    listingId: formData.get("listingId") ?? "",
  });
  if (!parsed.success) return { error: "Write something before you post." };
  if (containsProfanity(parsed.data.content)) {
    return { error: "That post contains language we don't allow — please edit it and try again." };
  }

  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return { error: "Vendor profile not found." };

  if (parsed.data.listingId) {
    const owner = await getOwningVendorProfileId("listing", parsed.data.listingId);
    if (owner !== vendorProfile.id) return { error: "You can only post about your own listings." };
  }

  const recentPosts = await countInLastHour(posts, posts.vendorProfileId, posts.createdAt, vendorProfile.id);
  if (recentPosts >= RATE_LIMITS.postsPerHour) {
    return { error: "You're posting a lot right now — try again in a bit." };
  }

  const images = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_IMAGES);

  const [post] = await db
    .insert(posts)
    .values({
      authorType: "vendor",
      vendorProfileId: vendorProfile.id,
      content: parsed.data.content,
      contextType: parsed.data.listingId ? "listing" : null,
      contextId: parsed.data.listingId || null,
      status: "visible",
    })
    .returning();

  for (let i = 0; i < images.length; i++) {
    const buffer = Buffer.from(await images[i].arrayBuffer());
    await db.insert(postImages).values({
      postId: post.id,
      data: buffer,
      mimeType: images[i].type || "image/webp",
      sortOrder: i,
    });
  }

  await generateVendorPostItem(post.id, vendorProfile.businessName);

  revalidatePath("/social");
  revalidatePath("/vendor/dashboard/posts");
  if (parsed.data.listingId) revalidatePath(`/explore/${parsed.data.listingId}`);

  return {};
}

export async function deleteVendorPostAction(postId: string) {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) throw new Error("Vendor profile not found.");

  const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post || post.vendorProfileId !== vendorProfile.id) throw new Error("Post not found.");

  await db.delete(posts).where(eq(posts.id, postId));
  revalidatePath("/social");
  revalidatePath("/vendor/dashboard/posts");
  if (post.contextType === "listing" && post.contextId) revalidatePath(`/explore/${post.contextId}`);
}
