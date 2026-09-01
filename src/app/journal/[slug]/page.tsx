import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NewsletterForm } from "@/components/newsletter-form";
import { renderMarkdown, readingTimeMinutes } from "@/lib/markdown";
import { getJournalPostBySlug, getRelatedJournalPosts } from "@/lib/data/journal";

export const revalidate = 60;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const row = await getJournalPostBySlug(slug);
  if (!row) return {};
  const { post } = row;
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  const image = post.ogImage || post.coverImage || undefined;

  return {
    title: `${title} — Wano Journal`,
    description,
    alternates: { canonical: `${APP_URL}/journal/${post.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${APP_URL}/journal/${post.slug}`,
      images: image ? [{ url: image }] : undefined,
      publishedTime: post.publishedAt?.toISOString(),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function JournalPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await getJournalPostBySlug(slug);
  if (!row) notFound();
  const { post, authorName } = row;

  const related = await getRelatedJournalPosts(post.tags, post.id);
  const url = `${APP_URL}/journal/${post.slug}`;
  const shareText = encodeURIComponent(`${post.title} — ${url}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.ogImage || post.coverImage || undefined,
    author: { "@type": "Person", name: authorName },
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    mainEntityOfPage: url,
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-xs font-medium uppercase tracking-wide text-nile-700">{post.category}</p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-forest-900">{post.title}</h1>
      <p className="mt-2 text-sm text-forest-800/60">
        {authorName} ·{" "}
        {post.publishedAt
          ? new Date(post.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
          : ""}{" "}
        · {readingTimeMinutes(post.body)} min read
      </p>

      {post.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverImage} alt="" className="mt-5 w-full rounded-2xl object-cover" />
      )}

      <div className="journal-body mt-6" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }} />

      <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-forest-900/10 pt-5">
        <span className="text-xs font-medium text-forest-800/50">Share:</span>
        <a
          href={`https://wa.me/?text=${shareText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-forest-900/15 px-3 py-1.5 text-xs font-semibold text-forest-800 hover:bg-forest-50"
        >
          WhatsApp
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${shareText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-forest-900/15 px-3 py-1.5 text-xs font-semibold text-forest-800 hover:bg-forest-50"
        >
          X
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-forest-900/15 px-3 py-1.5 text-xs font-semibold text-forest-800 hover:bg-forest-50"
        >
          Facebook
        </a>
      </div>

      <div className="mt-8">
        <NewsletterForm source={`journal_post_${post.slug}`} />
      </div>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold text-forest-900">Related</h2>
          <div className="mt-3 space-y-3">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/journal/${r.slug}`}
                className="block rounded-xl border border-forest-900/10 bg-white p-4 hover:border-forest-900/20"
              >
                <p className="text-sm font-medium text-forest-900">{r.title}</p>
                <p className="text-xs text-forest-800/60">{r.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
