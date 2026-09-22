"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { conversations, messages, stories } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { findConversationBetween } from "@/lib/data/messages";
import { getBlockedTravellerIds } from "@/lib/data/moderation";
import { containsProfanity } from "@/lib/profanity";
import { countInLastHour, RATE_LIMITS } from "@/lib/rate-limit";
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

/** A story reply, sent as a direct message to the story's owner — same as
 * Instagram's model, and reuses the existing 1:1 messaging system rather
 * than a separate reaction/reply store. Used for both the text reply box
 * and the quick heart-react (which just sends "❤️"). */
export async function replyToStoryAction(storyId: string, content: string): Promise<ActionState> {
  const session = await requireRole("traveller");
  const viewerProfile = await getTravellerProfileByUserId(session.userId);
  if (!viewerProfile) return { error: "Profile not found." };

  const trimmed = content.trim();
  if (!trimmed) return { error: "Write something before sending." };
  if (trimmed.length > 2000) return { error: "That message is too long." };

  const ownerId = await getStoryOwner(storyId);
  if (!ownerId) return { error: "That story is no longer available." };
  if (ownerId === viewerProfile.id) return { error: "You can't message yourself." };

  const blockedIds = await getBlockedTravellerIds(viewerProfile.id);
  if (blockedIds.has(ownerId)) return { error: "You can't message this person." };

  const recentCount = await countInLastHour(
    messages,
    messages.senderTravellerId,
    messages.createdAt,
    viewerProfile.id,
  );
  if (recentCount >= RATE_LIMITS.messagesPerHour) {
    return { error: "You're sending a lot of messages — try again in a bit." };
  }

  let conversation = await findConversationBetween(viewerProfile.id, ownerId);
  if (!conversation) {
    const [travellerOneId, travellerTwoId] = [viewerProfile.id, ownerId].sort();
    [conversation] = await db.insert(conversations).values({ travellerOneId, travellerTwoId }).returning();
  }

  await db.insert(messages).values({
    conversationId: conversation.id,
    senderTravellerId: viewerProfile.id,
    content: `Re your story: ${trimmed}`,
  });
  await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversation.id));

  revalidatePath(`/messages/${conversation.id}`);
  revalidatePath("/messages");
  return {};
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
