import { notFound } from "next/navigation";
import Link from "next/link";
import { JournalEditor } from "../journal-editor";
import { deleteJournalPostAction, updateJournalPostAction } from "@/lib/actions/journal-actions";
import { getAdminAuthors, getJournalPostById } from "@/lib/data/journal";

function toDatetimeLocal(date: Date | null) {
  if (!date) return "";
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default async function EditJournalPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, authors] = await Promise.all([getJournalPostById(id), getAdminAuthors()]);
  if (!post) notFound();

  const boundUpdate = updateJournalPostAction.bind(null, id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-900">Edit journal post</h1>
          {post.status === "published" && (
            <Link href={`/journal/${post.slug}`} target="_blank" className="text-sm text-nile-700 hover:underline">
              View live →
            </Link>
          )}
        </div>
        <form action={deleteJournalPostAction.bind(null, id)}>
          <button
            type="submit"
            className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        </form>
      </div>
      <JournalEditor
        action={boundUpdate}
        authors={authors}
        initial={{
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          body: post.body,
          coverImage: post.coverImage,
          authorUserId: post.authorUserId,
          category: post.category,
          tags: post.tags,
          status: post.status,
          publishedAt: toDatetimeLocal(post.publishedAt),
          seoTitle: post.seoTitle,
          seoDescription: post.seoDescription,
          ogImage: post.ogImage,
        }}
      />
    </div>
  );
}
