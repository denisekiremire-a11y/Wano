import Link from "next/link";
import { notFound } from "next/navigation";
import { UserIcon } from "@/components/icons";
import { MessageComposer } from "@/components/message-composer";
import { requireRole } from "@/lib/auth";
import { getConversationForViewer, getMessagesForConversation } from "@/lib/data/messages";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return null;

  const convo = await getConversationForViewer(id, travellerProfile.id);
  if (!convo) notFound();

  const rows = await getMessagesForConversation(id);

  return (
    <main className="mx-auto flex max-w-2xl flex-col px-4 py-8 md:px-6">
      <div className="flex items-center gap-3 border-b border-forest-900/10 pb-4">
        <Link href="/messages" className="text-sm font-medium text-forest-800/60 hover:text-forest-900">
          ← Back
        </Link>
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-forest-100 text-forest-500">
          <UserIcon className="h-5 w-5" />
        </span>
        <Link
          href={convo.other.user.username ? `/profile/${convo.other.user.username}` : "#"}
          className="font-display text-lg font-semibold text-forest-900 hover:underline"
        >
          {convo.other.traveller.displayName}
        </Link>
      </div>

      <div className="mt-4 flex flex-1 flex-col gap-2">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-forest-800/60">
            No messages yet — say hello to {convo.other.traveller.displayName}.
          </p>
        ) : (
          rows.map(({ message, senderTravellerId }) => {
            const own = senderTravellerId === travellerProfile.id;
            return (
              <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    own ? "bg-forest-800 text-white" : "bg-forest-50 text-forest-900"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            );
          })
        )}
      </div>

      <MessageComposer conversationId={id} />
    </main>
  );
}
