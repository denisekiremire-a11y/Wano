import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages, travellerProfiles, users } from "@/db/schema";

/** Every conversation a traveller is part of, newest activity first, each
 * with the other participant's profile and the most recent message for a
 * preview line. */
export async function getConversationsForTraveller(travellerId: string) {
  const rows = await db
    .select({ conversation: conversations, otherTraveller: travellerProfiles, otherUser: users })
    .from(conversations)
    .innerJoin(
      travellerProfiles,
      or(
        and(eq(conversations.travellerOneId, travellerId), eq(travellerProfiles.id, conversations.travellerTwoId)),
        and(eq(conversations.travellerTwoId, travellerId), eq(travellerProfiles.id, conversations.travellerOneId)),
      ),
    )
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(or(eq(conversations.travellerOneId, travellerId), eq(conversations.travellerTwoId, travellerId)))
    .orderBy(desc(conversations.lastMessageAt));

  const conversationIds = rows.map((r) => r.conversation.id);
  const recentMessages =
    conversationIds.length > 0
      ? await db
          .select()
          .from(messages)
          .where(inArray(messages.conversationId, conversationIds))
          .orderBy(desc(messages.createdAt))
      : [];

  const lastMessageByConversation = new Map<string, (typeof recentMessages)[number]>();
  for (const message of recentMessages) {
    if (!lastMessageByConversation.has(message.conversationId)) {
      lastMessageByConversation.set(message.conversationId, message);
    }
  }

  return rows.map((r) => ({ ...r, lastMessage: lastMessageByConversation.get(r.conversation.id) ?? null }));
}

/** A conversation plus the other participant's profile — null if it
 * doesn't exist or the viewer isn't one of its two participants, so a page
 * can 404 either way without leaking whether the id exists. */
export async function getConversationForViewer(conversationId: string, viewerTravellerId: string) {
  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  if (!conversation) return null;
  if (conversation.travellerOneId !== viewerTravellerId && conversation.travellerTwoId !== viewerTravellerId) {
    return null;
  }

  const otherTravellerId =
    conversation.travellerOneId === viewerTravellerId ? conversation.travellerTwoId : conversation.travellerOneId;
  const [other] = await db
    .select({ traveller: travellerProfiles, user: users })
    .from(travellerProfiles)
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(eq(travellerProfiles.id, otherTravellerId))
    .limit(1);

  return { conversation, other };
}

export async function getMessagesForConversation(conversationId: string) {
  return db
    .select({ message: messages, senderTravellerId: messages.senderTravellerId })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

/** The existing conversation between two travellers, if one exists —
 * checked before creating a new one so a first message from either side
 * always lands in the same thread. */
export async function findConversationBetween(travellerAId: string, travellerBId: string) {
  const [one, two] = [travellerAId, travellerBId].sort();
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.travellerOneId, one), eq(conversations.travellerTwoId, two)))
    .limit(1);
  return conversation ?? null;
}
