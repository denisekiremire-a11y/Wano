import Link from "next/link";
import { getAllJournalPostsForAdmin } from "@/lib/data/journal";
import { requireAdminPage } from "@/lib/auth";

const STATUS_STYLE: Record<string, string> = {
  draft: "text-ink/40",
  scheduled: "text-ember",
  published: "text-ink",
};

export default async function AdminJournalPage() {
  await requireAdminPage("/admin/journal");
  const rows = await getAllJournalPostsForAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif-editorial text-2xl text-ink">Journal</h1>
          <p className="mt-1 text-sm text-ink/60">
            Write, preview, schedule, and publish — no deploy needed.
          </p>
        </div>
        <Link
          href="/admin/journal/new"
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/85"
        >
          New post
        </Link>
      </div>

      <div className="border-t border-ink/10">
        {rows.length === 0 ? (
          <p className="border-b border-ink/10 py-6 text-sm text-ink/50">No posts yet.</p>
        ) : (
          rows.map(({ post, authorName }) => (
            <Link
              key={post.id}
              href={`/admin/journal/${post.id}`}
              className="group/row flex items-center justify-between gap-4 border-b border-ink/10 py-4 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-ink transition-colors group-hover/row:text-ember">
                  {post.title}
                </p>
                <p className="eyebrow mt-1 text-ink/40">
                  {post.category} · {authorName}
                  {post.publishedAt ? ` · ${new Date(post.publishedAt).toLocaleDateString("en-GB")}` : ""}
                </p>
              </div>
              <span className={`eyebrow ${STATUS_STYLE[post.status]}`}>{post.status}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
