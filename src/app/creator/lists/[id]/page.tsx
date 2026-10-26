import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { removeCreatorListItemAction, withdrawCreatorListAction } from "@/lib/actions/creator-list-actions";
import { getCreatorList, getCreatorListPickOptions, LIST_MAX_ITEMS, LIST_MIN_ITEMS } from "@/lib/data/creator-lists";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { formatKampalaDateTime } from "@/lib/kampala-time";
import { LIST_STATUS_LABEL } from "@/lib/creator-list-labels";
import { AddPickForm, EditListForm, SubmitListButton } from "@/components/creator-lists/list-forms";

export default async function EditCreatorListPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("traveller");
  const traveller = await getTravellerProfileByUserId(session.userId);
  const { id } = await params;
  const list = await getCreatorList({ id });
  if (!list || !traveller || list.authorId !== traveller.id) notFound();

  const editable = list.status === "draft" || list.status === "rejected";
  const options = editable ? await getCreatorListPickOptions() : null;

  return (
    <main className="font-editorial-body bg-paper mx-auto max-w-xl space-y-6 px-4 py-10 md:px-6">
      <Link href="/creator/lists" className="eyebrow text-ink/40 hover:text-ink">
        ← My lists
      </Link>
      <div>
        <p className="eyebrow text-ember">{LIST_STATUS_LABEL[list.status] ?? list.status}</p>
        <h1 className="font-serif-editorial mt-2 text-3xl text-ink">{list.title}</h1>
        <Link href={`/lists/${list.slug}`} className="mt-1 inline-block text-sm text-ember hover:underline">
          {list.status === "published" ? "See it live →" : "Preview →"}
        </Link>
      </div>

      {list.status === "rejected" && list.reviewNote && (
        <p className="border-l-2 border-ember pl-4 text-sm text-ink">
          <span className="font-semibold">Note from the Wano team:</span> {list.reviewNote}
        </p>
      )}

      {!editable && (
        <section className="space-y-3 border border-ink/10 bg-white p-5">
          <p className="text-sm text-ink/70">
            {list.status === "in_review"
              ? "The Wano team is checking this list. You'll see it go live here."
              : "This list is live. To change it, take it back to draft. It goes offline until it's checked again."}
          </p>
          <form action={withdrawCreatorListAction.bind(null, list.id)}>
            <button className="text-sm font-semibold text-ink/60 hover:text-ink">Back to draft to edit</button>
          </form>
        </section>
      )}

      {editable && (
        <section className="space-y-3 border border-ink/10 bg-white p-5">
          <h2 className="font-serif-editorial text-lg text-ink">Details</h2>
          <EditListForm listId={list.id} current={{ title: list.title, intro: list.intro, area: list.area }} />
        </section>
      )}

      <section className="space-y-3 border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">
          Picks <span className="font-mono-data text-sm text-ink/40">{list.items.length}/{LIST_MAX_ITEMS}</span>
        </h2>
        {list.items.length === 0 && <p className="text-sm text-ink/50">No picks yet.</p>}
        <ol className="space-y-2">
          {list.items.map((item, i) => (
            <li key={item.id} className="flex items-start justify-between gap-3 border-t border-ink/10 pt-2 first:border-0 first:pt-0">
              <div>
                <p className="text-sm text-ink">
                  <span className="font-mono-data text-ink/40">{i + 1}.</span> {item.title}
                  {!item.live && <span className="ml-2 text-xs text-red-700">offline</span>}
                </p>
                {item.note && <p className="text-xs text-ink/60">{item.note}</p>}
              </div>
              {editable && (
                <form action={removeCreatorListItemAction.bind(null, list.id, item.id)}>
                  <button className="text-xs text-ink/40 hover:text-red-700">Remove</button>
                </form>
              )}
            </li>
          ))}
        </ol>
        {editable && options && list.items.length < LIST_MAX_ITEMS && (
          <div className="border-t border-ink/10 pt-3">
            <AddPickForm
              listId={list.id}
              places={options.places}
              upcoming={options.upcoming.map((e) => ({ id: e.id, title: e.title, when: formatKampalaDateTime(e.startAt) }))}
            />
          </div>
        )}
      </section>

      {editable && (
        <section className="space-y-2">
          <SubmitListButton listId={list.id} />
          <p className="text-xs text-ink/50">
            Needs a short intro and at least {LIST_MIN_ITEMS} picks. Lists earn no XP or payment for now.
          </p>
        </section>
      )}
    </main>
  );
}
