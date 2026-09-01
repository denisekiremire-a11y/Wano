import Link from "next/link";
import { getAllJournalPostsForAdmin } from "@/lib/data/journal";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-forest-50 text-forest-800/60",
  scheduled: "bg-marigold-100 text-marigold-800",
  published: "bg-forest-100 text-forest-800",
};

export default async function AdminJournalPage() {
  const rows = await getAllJournalPostsForAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-900">Journal</h1>
          <p className="mt-1 text-sm text-forest-800/60">
            Write, preview, schedule, and publish — no deploy needed.
          </p>
        </div>
        <Link
          href="/admin/journal/new"
          className="rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-700"
        >
          New post
        </Link>
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-forest-800/60">No posts yet.</p>
        ) : (
          rows.map(({ post, authorName }) => (
            <Link
              key={post.id}
              href={`/admin/journal/${post.id}`}
              className="flex items-center justify-between rounded-xl border border-forest-900/10 bg-white p-4 hover:border-forest-900/20"
            >
              <div>
                <p className="text-sm font-medium text-forest-900">{post.title}</p>
                <p className="text-xs text-forest-800/50">
                  {post.category} · {authorName}
                  {post.publishedAt ? ` · ${new Date(post.publishedAt).toLocaleDateString("en-GB")}` : ""}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLE[post.status]}`}>
                {post.status}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
