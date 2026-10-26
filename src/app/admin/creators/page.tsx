import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { unpublishCreatorListAction } from "@/lib/actions/creator-list-actions";
import { getCreatorListsForAdmin, getCreators } from "@/lib/data/creator-lists";
import { LIST_STATUS_LABEL } from "@/lib/creator-list-labels";
import { ReviewListForm } from "@/components/creator-lists/list-forms";

export default async function AdminCreatorsPage() {
  await requireAdminPage("/admin/creators");
  const [lists, creators] = await Promise.all([getCreatorListsForAdmin(), getCreators()]);
  const waiting = lists.filter((l) => l.status === "in_review");
  const rest = lists.filter((l) => l.status !== "in_review");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink">Creator lists</h1>
        <p className="mt-1 text-sm text-ink/60">
          Lists by members of the creator programme. Nothing goes public until it&apos;s published here. Add or remove
          creators from a member&apos;s page under Members.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="eyebrow text-ember">Waiting for review ({waiting.length})</h2>
        {waiting.length === 0 && <p className="text-sm text-ink/50">Nothing to review.</p>}
        {waiting.map((l) => (
          <div key={l.id} className="space-y-3 border border-ink/10 bg-white p-4">
            <div>
              <Link href={`/lists/${l.slug}`} className="font-medium text-ink hover:text-ember">
                {l.title} →
              </Link>
              <p className="font-mono-data text-xs text-ink/50">
                {l.authorName} · {l.itemCount} picks · sent {l.submittedAt?.toLocaleDateString("en-GB")}
              </p>
              {l.intro && <p className="mt-2 text-sm text-ink/70">{l.intro}</p>}
            </div>
            <ReviewListForm listId={l.id} />
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="eyebrow text-ink/50">All lists</h2>
        <div className="border-t border-ink/10">
          {rest.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 border-b border-ink/10 py-3">
              <div>
                <Link href={`/lists/${l.slug}`} className="text-ink hover:text-ember">
                  {l.title}
                </Link>
                <p className="font-mono-data text-xs text-ink/50">
                  {l.authorName} · {l.itemCount} picks
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="eyebrow text-ink/50">{LIST_STATUS_LABEL[l.status] ?? l.status}</span>
                {l.status === "published" && (
                  <form action={unpublishCreatorListAction.bind(null, l.id)}>
                    <button className="text-xs text-ink/50 hover:text-red-700">Take down</button>
                  </form>
                )}
              </div>
            </div>
          ))}
          {rest.length === 0 && <p className="py-3 text-sm text-ink/50">No other lists yet.</p>}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="eyebrow text-ink/50">Creators ({creators.length})</h2>
        <div className="border-t border-ink/10">
          {creators.map((c) => (
            <Link
              key={c.id}
              href={`/admin/travellers/${c.id}`}
              className="flex justify-between border-b border-ink/10 py-2 text-sm text-ink hover:text-ember"
            >
              {c.name}
              <span className="font-mono-data text-xs text-ink/40">since {c.since?.toLocaleDateString("en-GB")}</span>
            </Link>
          ))}
          {creators.length === 0 && <p className="py-3 text-sm text-ink/50">No creators yet.</p>}
        </div>
      </section>
    </div>
  );
}
