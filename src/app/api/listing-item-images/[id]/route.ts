import { eq } from "drizzle-orm";
import { db } from "@/db";
import { listingItemImages } from "@/db/schema";

// Public — same reasoning as /api/listing-images/[id]: menu/service/room/
// vehicle photos are meant to be visible to anyone browsing a listing.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [image] = await db.select().from(listingItemImages).where(eq(listingItemImages.id, id)).limit(1);
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
