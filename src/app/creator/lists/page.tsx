import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getCreatorProfile, getMyCreatorLists } from "@/lib/data/creator-lists";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { LIST_STATUS_LABEL } from "@/lib/creator-list-labels";
import { CreatorBadge } from "@/components/creator-lists/creator-badge";
import { NewListForm } from "@/components/creator-lists/list-forms";

export const metadata = { title: "My creator lists" };

export default async function MyCreatorListsPage() {
  const session = await requireRole("traveller");
  const traveller = await getTravellerProfileByUserId(session.userId);
  if (!traveller) return null;
  const creator = await getCreatorProfile(traveller.id);

  if (!creator) {
    return (
      <main className="font-editorial-body bg-paper mx-auto max-w-xl space-y-4 px-4 py-10 md:px-6">
        <p className="eyebrow text-ember">Creator lists</p>
        <h1 className="font-serif-editorial text-3xl text-ink">For Wano creators</h1>
        <p className="text-sm text-ink/70">
          Creator lists are short guides by people in the Wano creator programme. The Wano team invites creators
          directly. Meanwhile, <Link href="/lists" className="text-ember hover:underline">see the lists that are live</Link>.
        </p>
      </main>
    );
  }

  const lists = await getMyCreatorLists(traveller.id);
  return (
    <main className="font-editorial-body bg-paper mx-auto max-w-xl space-y-6 px-4 py-10 md:px-6">
      <div>
        <CreatorBadge />
        <h1 className="font-serif-editorial mt-2 text-3xl text-ink">My lists</h1>
        <p className="mt-1 text-sm text-ink/60">
          Pick 3 to 10 Wano places or events and say why. The Wano team checks each list before it goes live.
        </p>
      </div>

      {lists.length > 0 && (
        <ul className="border-t border-ink/10">
          {lists.map((l) => (
            <li key={l.id}>
              <Link
                href={`/creator/lists/${l.id}`}
                className="flex items-center justify-between gap-3 border-b border-ink/10 py-3 hover:text-ember"
              >
                <span>
                  <span className="block text-ink">{l.title}</span>
                  <span className="font-mono-data text-xs text-ink/50">{l.itemCount} picks</span>
                </span>
                <span className="eyebrow flex-none text-ink/50">{LIST_STATUS_LABEL[l.status] ?? l.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="space-y-3 border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">New list</h2>
        <NewListForm />
      </section>
    </main>
  );
}
