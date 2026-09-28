import Link from "next/link";
import { notFound } from "next/navigation";
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
    <main className="font-editorial-body bg-paper flex flex-col">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 md:px-6">
        <div className="flex items-center gap-3 border-b border-ink/10 pb-4">
          <Link href="/messages" className="eyebrow text-ink/40 hover:text-ink">
            ← Back
          </Link>
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ink/5 text-sm font-semibold text-ink/60">
            {convo.other.traveller.displayName.charAt(0).toUpperCase()}
          </span>
          <Link
            href={convo.other.user.username ? `/profile/${convo.other.user.username}` : "#"}
            className="font-serif-editorial text-lg text-ink hover:text-ember"
          >
            {convo.other.traveller.displayName}
          </Link>
        </div>

        <div className="mt-4 flex flex-1 flex-col gap-2">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink/50">
              No messages yet — say hello to {convo.other.traveller.displayName}.
            </p>
          ) : (
            rows.map(({ message, senderTravellerId }) => {
              const own = senderTravellerId === travellerProfile.id;
              return (
                <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] px-3.5 py-2 text-sm ${
                      own ? "bg-ink text-white" : "bg-ink/5 text-ink"
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
      </div>
    </main>
  );
}
