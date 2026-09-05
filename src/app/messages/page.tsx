import Link from "next/link";
import { UserIcon } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { getConversationsForTraveller } from "@/lib/data/messages";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";

export default async function MessagesPage() {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return null;

  const conversations = await getConversationsForTraveller(travellerProfile.id);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="font-display text-2xl font-semibold text-forest-900">Messages</h1>

      {conversations.length === 0 ? (
        <p className="mt-6 rounded-xl border border-forest-900/10 bg-white p-6 text-center text-sm text-forest-800/60">
          No conversations yet — visit someone&apos;s profile and hit &quot;Message&quot; to start one.
        </p>
      ) : (
        <div className="mt-6 space-y-2">
          {conversations.map(({ conversation, otherTraveller, otherUser, lastMessage }) => (
            <Link
              key={conversation.id}
              href={`/messages/${conversation.id}`}
              className="flex items-center gap-3 rounded-xl border border-forest-900/10 bg-white p-4 transition hover:bg-forest-50/50"
            >
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-forest-100 text-forest-500">
                <UserIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-forest-900">
                  {otherTraveller.displayName}{" "}
                  {otherUser.username && <span className="font-normal text-forest-800/50">@{otherUser.username}</span>}
                </p>
                <p className="truncate text-sm text-forest-800/60">
                  {lastMessage ? lastMessage.content : "Say hello…"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
