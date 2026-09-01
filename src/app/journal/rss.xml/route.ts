import { getPublishedJournalPosts } from "@/lib/data/journal";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const rows = await getPublishedJournalPosts();

  const items = rows
    .map(({ post }) => {
      const url = `${APP_URL}/journal/${post.slug}`;
      return `<item>
  <title>${escapeXml(post.title)}</title>
  <link>${url}</link>
  <guid>${url}</guid>
  <description>${escapeXml(post.excerpt)}</description>
  <pubDate>${(post.publishedAt ?? post.createdAt).toUTCString()}</pubDate>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Wano Journal</title>
  <link>${APP_URL}/journal</link>
  <description>Practical guides for getting around, eating well, and making the most of Uganda.</description>
  ${items}
</channel>
</rss>`;

  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
