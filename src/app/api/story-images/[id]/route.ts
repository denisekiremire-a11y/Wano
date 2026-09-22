import { eq } from "drizzle-orm";
import { db } from "@/db";
import { stories } from "@/db/schema";

// Public, same as /api/post-images — a story's photo is visible to anyone
// who can see the story itself. Shorter cache than post images since
// stories are ephemeral (24h), not permanent content.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [image] = await db.select().from(stories).where(eq(stories.id, id)).limit(1);
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
