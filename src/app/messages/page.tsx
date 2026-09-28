import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getConversationsForTraveller } from "@/lib/data/messages";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";

export default async function MessagesPage() {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return null;

  const conversations = await getConversationsForTraveller(travellerProfile.id);

  return (
    <main className="font-editorial-body bg-paper">
      <div className="mx-auto max-w-2xl px-4 py-12 md:px-6">
        <p className="eyebrow text-ember">Inbox</p>
        <h1 className="font-serif-editorial mt-2 text-4xl text-ink md:text-5xl">Messages</h1>

        {conversations.length === 0 ? (
          <p className="mt-8 border border-ink/10 bg-white p-6 text-center text-sm text-ink/50">
            No conversations yet — visit someone&apos;s profile and hit &quot;Message&quot; to start one.
          </p>
        ) : (
          <div className="mt-8 border-t border-ink/10">
            {conversations.map(({ conversation, otherTraveller, otherUser, lastMessage }) => (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.id}`}
                className="flex items-center gap-3 border-b border-ink/10 py-4 transition-colors hover:text-ember"
              >
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-ink/5 text-sm font-semibold text-ink/60">
                  {otherTraveller.displayName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {otherTraveller.displayName}{" "}
                    {otherUser.username && <span className="font-normal text-ink/40">@{otherUser.username}</span>}
                  </p>
                  <p className="truncate text-sm text-ink/50">
                    {lastMessage ? lastMessage.content : "Say hello…"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
