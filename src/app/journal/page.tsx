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
    <main className="font-editorial-body bg-paper">
      <section className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <p className="eyebrow text-ember">Wano Journal</p>
        <h1 className="font-serif-editorial mt-2 text-4xl text-ink md:text-5xl">Journal</h1>
        <p className="mt-3 max-w-xl text-ink/60">
          Practical guides for getting around, eating well, and making the most of Uganda.
        </p>

        <div className="mt-10 grid gap-8 md:grid-cols-[1fr_280px]">
          <div className="border-t border-ink/10">
            {rows.length === 0 ? (
              <p className="border-b border-ink/10 py-6 text-sm text-ink/50">
                Nothing published yet — check back soon.
              </p>
            ) : (
              rows.map(({ post, authorName }) => (
                <Link
                  key={post.id}
                  href={`/journal/${post.slug}`}
                  className="group/row block border-b border-ink/10 py-6 transition-colors"
                >
                  <p className="eyebrow text-ember">{post.category}</p>
                  <h2 className="font-serif-editorial mt-2 text-2xl text-ink transition-colors group-hover/row:text-ember">
                    {post.title}
                  </h2>
                  <p className="mt-1.5 text-sm text-ink/60">{post.excerpt}</p>
                  <p className="eyebrow mt-3 text-ink/35">
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
      </section>
    </main>
  );
}
