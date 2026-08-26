"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { follows, postComments, postLikes, posts } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import type { ActionState } from "@/lib/validation";

const postSchema = z.object({
  content: z.string().min(1).max(500),
  imageUrl: z.string().url().max(500).optional().or(z.literal("")),
  listingId: z.string().uuid().optional().or(z.literal("")),
  eventId: z.string().uuid().optional().or(z.literal("")),
});

export async function createPostAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("traveller");
  const parsed = postSchema.safeParse({
    content: formData.get("content"),
    imageUrl: formData.get("imageUrl") ?? "",
    listingId: formData.get("listingId") ?? "",
    eventId: formData.get("eventId") ?? "",
  });
  if (!parsed.success) return { error: "Write something before you post." };

  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Profile not found." };

  await db.insert(posts).values({
    travellerId: travellerProfile.id,
    content: parsed.data.content,
    imageUrl: parsed.data.imageUrl || null,
    listingId: parsed.data.listingId || null,
    eventId: parsed.data.eventId || null,
  });

  revalidatePath("/social");
  revalidatePath("/profile");
  return {};
}

export async function togglePostLikeAction(postId: string) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) throw new Error("Traveller profile not found.");

  const [existing] = await db
    .select()
    .from(postLikes)
    .where(and(eq(postLikes.postId, postId), eq(postLikes.travellerId, travellerProfile.id)))
    .limit(1);

  if (existing) {
    await db.delete(postLikes).where(eq(postLikes.id, existing.id));
  } else {
    await db.insert(postLikes).values({ postId, travellerId: travellerProfile.id });
  }

  revalidatePath("/social");
}

const commentSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().min(1).max(300),
});

export async function addCommentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("traveller");
  const parsed = commentSchema.safeParse({
    postId: formData.get("postId"),
    content: formData.get("content"),
  });
  if (!parsed.success) return { error: "Comment can't be empty." };

  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Profile not found." };

  await db.insert(postComments).values({
    postId: parsed.data.postId,
    travellerId: travellerProfile.id,
    content: parsed.data.content,
  });

  revalidatePath("/social");
  return {};
}

export async function toggleFollowAction(targetTravellerId: string) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) throw new Error("Traveller profile not found.");
  if (travellerProfile.id === targetTravellerId) return;

  const [existing] = await db
    .select()
    .from(follows)
    .where(and(eq(follows.followerId, travellerProfile.id), eq(follows.followingId, targetTravellerId)))
    .limit(1);

  if (existing) {
    await db.delete(follows).where(eq(follows.id, existing.id));
  } else {
    await db.insert(follows).values({ followerId: travellerProfile.id, followingId: targetTravellerId });
  }

  revalidatePath("/social");
  revalidatePath("/profile");
}
