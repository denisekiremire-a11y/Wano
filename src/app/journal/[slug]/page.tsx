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
    <main className="font-editorial-body bg-paper">
      <section className="mx-auto max-w-2xl px-4 py-12 md:px-6">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        <p className="eyebrow text-ember">{post.category}</p>
        <h1 className="font-serif-editorial mt-2 text-4xl text-ink md:text-5xl">{post.title}</h1>
        <p className="eyebrow mt-3 text-ink/35">
          {authorName} ·{" "}
          {post.publishedAt
            ? new Date(post.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            : ""}{" "}
          · {readingTimeMinutes(post.body)} min read
        </p>

        {post.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImage} alt="" className="mt-6 w-full border border-ink/10 object-cover" />
        )}

        <div className="journal-body mt-8" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }} />

        <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-ink/10 pt-6">
          <span className="eyebrow text-ink/40">Share:</span>
          <a
            href={`https://wa.me/?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-ink/5"
          >
            WhatsApp
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-ink/5"
          >
            X
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-ink/5"
          >
            Facebook
          </a>
          <Link
            href={`/social?context_type=journal_post&context_id=${post.id}`}
            className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-ink/85"
          >
            Share this on Wano
          </Link>
        </div>

        <div className="mt-8">
          <NewsletterForm source={`journal_post_${post.slug}`} />
        </div>

        {related.length > 0 && (
          <section className="mt-10 border-t border-ink/10 pt-6">
            <h2 className="font-serif-editorial text-2xl text-ink">Related</h2>
            <div className="mt-3 border-t border-ink/10">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/journal/${r.slug}`}
                  className="group/row block border-b border-ink/10 py-4 transition-colors"
                >
                  <p className="text-sm font-medium text-ink transition-colors group-hover/row:text-ember">
                    {r.title}
                  </p>
                  <p className="mt-0.5 text-xs text-ink/55">{r.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
