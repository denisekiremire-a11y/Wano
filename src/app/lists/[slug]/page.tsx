import Link from "next/link";
import { notFound } from "next/navigation";
import { getCreatorList } from "@/lib/data/creator-lists";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { formatKampalaDateTime } from "@/lib/kampala-time";
import { getSession } from "@/lib/session";
import { CreatorBadge } from "@/components/creator-lists/creator-badge";

/** A creator list. Public once published; before that only its author and
 * admins can open it (as a preview). */
export default async function CreatorListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const list = await getCreatorList({ slug });
  if (!list) notFound();
  const live = list.status === "published" && list.author.isCreator;
  if (!live) {
    const session = await getSession();
    const viewer = session?.role === "traveller" ? await getTravellerProfileByUserId(session.userId) : null;
    if (session?.role !== "admin" && viewer?.id !== list.authorId) notFound();
  }
  const items = live ? list.items.filter((i) => i.live) : list.items;

  return (
    <main className="font-editorial-body bg-paper mx-auto max-w-2xl space-y-6 px-4 py-10 md:px-6">
      <Link href="/lists" className="eyebrow text-ink/40 hover:text-ink">
        ← Creator lists
      </Link>
      {!live && (
        <p className="border border-ember/40 bg-ember/5 p-3 text-sm text-ink">Preview. Only you and the Wano team can see this.</p>
      )}
      <div>
        <h1 className="font-serif-editorial text-3xl text-ink md:text-4xl">{list.title}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink/70">
          By{" "}
          {list.author.username ? (
            <Link href={`/profile/${list.author.username}`} className="font-semibold text-ink hover:text-ember">
              {list.author.name}
            </Link>
          ) : (
            <span className="font-semibold text-ink">{list.author.name}</span>
          )}
          {list.author.isCreator && <CreatorBadge />}
          {list.area && <span className="font-mono-data text-xs text-ink/40">{list.area}</span>}
        </p>
        {list.intro && <p className="mt-4 text-ink/70">{list.intro}</p>}
      </div>
      <ol className="border-t border-ink/10">
        {items.map((item, i) => (
          <li key={item.id}>
            <Link href={item.href} className="flex gap-4 border-b border-ink/10 py-4 hover:text-ember">
              <span className="font-mono-data text-2xl text-ink/30">{String(i + 1).padStart(2, "0")}</span>
              <span>
                <span className="block font-serif-editorial text-lg text-ink">{item.title}</span>
                <span className="block text-xs text-ink/50">
                  {item.kind === "event" && item.startsAt ? `${formatKampalaDateTime(item.startsAt)} · ` : ""}
                  {item.subtitle}
                </span>
                {item.note && <span className="mt-1 block text-sm text-ink/70">“{item.note}”</span>}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
