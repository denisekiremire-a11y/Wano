import Link from "next/link";
import type { Metadata } from "next";
import { NewsletterForm } from "@/components/newsletter-form";
import { readingTimeMinutes } from "@/lib/markdown";
import { getPublishedJournalPosts } from "@/lib/data/journal";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Journal — Wano",
  description: "Practical guides for getting around, eating well, and making the most of Uganda — from SIM cards to AFCON 2027 basics.",
};

export default async function JournalIndexPage() {
  const rows = await getPublishedJournalPosts();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-forest-900">Journal</h1>
        <p className="mt-2 text-sm text-forest-800/60">
          Practical guides for getting around, eating well, and making the most of Uganda.
        </p>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {rows.length === 0 ? (
            <p className="text-sm text-forest-800/60">Nothing published yet — check back soon.</p>
          ) : (
            rows.map(({ post, authorName }) => (
              <Link
                key={post.id}
                href={`/journal/${post.slug}`}
                className="block rounded-2xl border border-forest-900/10 bg-white p-5 transition hover:border-forest-900/20"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-nile-700">{post.category}</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-forest-900">{post.title}</h2>
                <p className="mt-1 text-sm text-forest-800/70">{post.excerpt}</p>
                <p className="mt-2 text-xs text-forest-800/50">
                  {authorName} ·{" "}
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                    : ""}{" "}
                  · {readingTimeMinutes(post.body)} min read
                </p>
              </Link>
            ))
          )}
        </div>

        <aside>
          <NewsletterForm source="journal_index_sidebar" />
        </aside>
      </div>
    </main>
  );
}
