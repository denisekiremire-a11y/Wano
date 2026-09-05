"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { conversations, messages, travellerProfiles } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getConversationForViewer, findConversationBetween } from "@/lib/data/messages";
import { getBlockedTravellerIds } from "@/lib/data/moderation";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { countInLastHour, RATE_LIMITS } from "@/lib/rate-limit";
import type { ActionState } from "@/lib/validation";

/** Finds or creates the 1:1 conversation with `recipientTravellerId` and
 * hands back its id — the "Message" button on a profile calls this, then
 * navigates to /messages/[id] itself so it can redirect client-side. */
export async function startConversationAction(
  recipientTravellerId: string,
): Promise<{ conversationId: string } | { error: string }> {
  const session = await requireRole("traveller");
  const viewerProfile = await getTravellerProfileByUserId(session.userId);
  if (!viewerProfile) return { error: "Profile not found." };
  if (viewerProfile.id === recipientTravellerId) return { error: "You can't message yourself." };

  const blockedIds = await getBlockedTravellerIds(viewerProfile.id);
  if (blockedIds.has(recipientTravellerId)) return { error: "You can't message this person." };

  const [recipient] = await db
    .select({ id: travellerProfiles.id })
    .from(travellerProfiles)
    .where(eq(travellerProfiles.id, recipientTravellerId))
    .limit(1);
  if (!recipient) return { error: "That person couldn't be found." };

  let conversation = await findConversationBetween(viewerProfile.id, recipientTravellerId);
  if (!conversation) {
    const [travellerOneId, travellerTwoId] = [viewerProfile.id, recipientTravellerId].sort();
    [conversation] = await db.insert(conversations).values({ travellerOneId, travellerTwoId }).returning();
  }

  return { conversationId: conversation.id };
}

export async function sendMessageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("traveller");
  const viewerProfile = await getTravellerProfileByUserId(session.userId);
  if (!viewerProfile) return { error: "Profile not found." };

  const conversationId = String(formData.get("conversationId") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  if (!conversationId) return { error: "Conversation not found." };
  if (!content) return { error: "Write something before sending." };
  if (content.length > 2000) return { error: "That message is too long." };

  const convo = await getConversationForViewer(conversationId, viewerProfile.id);
  if (!convo) return { error: "Conversation not found." };

  const blockedIds = await getBlockedTravellerIds(viewerProfile.id);
  if (blockedIds.has(convo.other.traveller.id)) return { error: "You can't message this person." };

  const recentCount = await countInLastHour(
    messages,
    messages.senderTravellerId,
    messages.createdAt,
    viewerProfile.id,
  );
  if (recentCount >= RATE_LIMITS.messagesPerHour) {
    return { error: "You're sending a lot of messages — try again in a bit." };
  }

  await db.insert(messages).values({ conversationId, senderTravellerId: viewerProfile.id, content });
  await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversationId));

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return {};
}
