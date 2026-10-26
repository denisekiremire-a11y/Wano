import Link from "next/link";
import { getPublishedCreatorLists } from "@/lib/data/creator-lists";
import { CreatorBadge } from "@/components/creator-lists/creator-badge";

export const metadata = { title: "Creator lists" };

export default async function CreatorListsPage() {
  const lists = await getPublishedCreatorLists();
  return (
    <main className="font-editorial-body bg-paper mx-auto max-w-2xl space-y-6 px-4 py-10 md:px-6">
      <div>
        <p className="eyebrow text-ember">Creator lists</p>
        <h1 className="font-serif-editorial mt-2 text-3xl text-ink">Kampala, picked by people who go out</h1>
        <p className="mt-1 text-sm text-ink/60">Short lists by Wano creators. Every list is checked by the Wano team.</p>
      </div>
      {lists.length === 0 ? (
        <p className="border-t border-ink/10 pt-4 text-sm text-ink/50">The first lists are on their way.</p>
      ) : (
        <ul className="border-t border-ink/10">
          {lists.map((l) => (
            <li key={l.id}>
              <Link href={`/lists/${l.slug}`} className="block border-b border-ink/10 py-4 hover:text-ember">
                <p className="font-serif-editorial text-xl text-ink">{l.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink/60">
                  {l.authorName} <CreatorBadge />
                  <span className="font-mono-data text-xs text-ink/40">
                    {l.itemCount} picks{l.area ? ` · ${l.area}` : ""}
                  </span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
