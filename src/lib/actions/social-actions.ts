"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { clubMemberships, follows, postComments, postImages, postLikes, posts, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { generateUserPostItem } from "@/lib/feed-generators";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { countInLastHour, RATE_LIMITS } from "@/lib/rate-limit";
import type { ActionState } from "@/lib/validation";

const MAX_IMAGES = 4;
const NEW_ACCOUNT_REVIEW_WINDOW_MS = 24 * 60 * 60 * 1000;

const postSchema = z.object({
  content: z.string().min(1).max(500),
  listingId: z.string().uuid().optional().or(z.literal("")),
  eventId: z.string().uuid().optional().or(z.literal("")),
  clubId: z.string().uuid().optional().or(z.literal("")),
});

export async function createPostAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("traveller");
  const parsed = postSchema.safeParse({
    content: formData.get("content"),
    listingId: formData.get("listingId") ?? "",
    eventId: formData.get("eventId") ?? "",
    clubId: formData.get("clubId") ?? "",
  });
  if (!parsed.success) return { error: "Write something before you post." };

  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Profile not found." };

  const recentPosts = await countInLastHour(posts, posts.travellerId, posts.createdAt, travellerProfile.id);
  if (recentPosts >= RATE_LIMITS.postsPerHour) {
    return { error: "You're posting a lot right now — try again in a bit." };
  }

  const images = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_IMAGES);

  const [user] = await db.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, session.userId)).limit(1);
  const isNewAccount = user ? Date.now() - user.createdAt.getTime() < NEW_ACCOUNT_REVIEW_WINDOW_MS : false;

  const [post] = await db
    .insert(posts)
    .values({
      travellerId: travellerProfile.id,
      content: parsed.data.content,
      listingId: parsed.data.listingId || null,
      eventId: parsed.data.eventId || null,
      clubId: parsed.data.clubId || null,
      // First posts from a brand-new account go to the moderation queue
      // before they're visible to anyone else — see /admin/moderation.
      status: isNewAccount ? "pending_review" : "visible",
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

  if (post.status === "visible") {
    await generateUserPostItem(post.id, travellerProfile.id, travellerProfile.displayName);
  }

  revalidatePath("/social");
  revalidatePath("/passport");
  if (parsed.data.clubId) revalidatePath(`/social/clubs/${parsed.data.clubId}`);
  if (parsed.data.listingId) revalidatePath(`/explore/${parsed.data.listingId}`);
  if (parsed.data.eventId) revalidatePath(`/events/${parsed.data.eventId}`);
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

  const recentComments = await countInLastHour(
    postComments,
    postComments.travellerId,
    postComments.createdAt,
    travellerProfile.id,
  );
  if (recentComments >= RATE_LIMITS.commentsPerHour) {
    return { error: "You're commenting a lot right now — try again in a bit." };
  }

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
  revalidatePath("/passport");
}

export async function toggleClubMembershipAction(clubId: string) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) throw new Error("Traveller profile not found.");

  const [existing] = await db
    .select()
    .from(clubMemberships)
    .where(and(eq(clubMemberships.travellerId, travellerProfile.id), eq(clubMemberships.clubId, clubId)))
    .limit(1);

  if (existing) {
    await db.delete(clubMemberships).where(eq(clubMemberships.id, existing.id));
  } else {
    await db.insert(clubMemberships).values({ travellerId: travellerProfile.id, clubId });
  }

  revalidatePath("/social");
  revalidatePath(`/social/clubs/${clubId}`);
}
