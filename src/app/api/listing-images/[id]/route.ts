import { eq } from "drizzle-orm";
import { db } from "@/db";
import { listingImages } from "@/db/schema";

// Public — listing photos are meant to be visible to anyone browsing
// Explore, same reasoning as /api/post-images/[id].
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [image] = await db.select().from(listingImages).where(eq(listingImages.id, id)).limit(1);
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
