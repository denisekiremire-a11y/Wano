import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userPhotos } from "@/db/schema";

// Public — a profile photo is meant to be visible wherever that user's
// identity appears (posts, stories, discover, their public profile), same
// reasoning as /api/post-images/[id]. Keyed by userId (not the photo row's
// own id) since it's a stable 1:1 — the URL in users.avatarUrl never
// changes across a re-upload, only the row's data/mimeType do.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [photo] = await db.select().from(userPhotos).where(eq(userPhotos.userId, id)).limit(1);
  if (!photo) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mimeType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
