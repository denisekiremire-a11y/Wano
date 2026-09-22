"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { stories } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { containsProfanity } from "@/lib/profanity";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { countStoriesInLast24h, getStoryOwner, recordStoryView } from "@/lib/data/stories";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import type { ActionState } from "@/lib/validation";

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

export async function createStoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Profile not found." };

  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) return { error: "Add a photo to share." };

  const caption = (formData.get("caption") as string | null)?.trim() || null;
  if (caption && containsProfanity(caption)) {
    return { error: "That caption contains language we don't allow — please edit it and try again." };
  }

  const recentStories = await countStoriesInLast24h(travellerProfile.id);
  if (recentStories >= RATE_LIMITS.storiesPerDay) {
    return { error: "You've shared a lot of stories today — try again tomorrow." };
  }

  const buffer = Buffer.from(await image.arrayBuffer());
  const now = new Date();
  await db.insert(stories).values({
    travellerId: travellerProfile.id,
    data: buffer,
    mimeType: image.type || "image/webp",
    caption,
    createdAt: now,
    expiresAt: new Date(now.getTime() + STORY_LIFETIME_MS),
  });

  revalidatePath("/social");
  return {};
}

export async function markStoryViewedAction(storyId: string) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return;
  await recordStoryView(storyId, travellerProfile.id);
}

export async function deleteStoryAction(storyId: string) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Profile not found." };

  const ownerId = await getStoryOwner(storyId);
  if (ownerId !== travellerProfile.id) return { error: "You can only delete your own stories." };

  await db.delete(stories).where(eq(stories.id, storyId));
  revalidatePath("/social");
  return {};
}
