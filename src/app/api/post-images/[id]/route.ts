import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postImages } from "@/db/schema";

// Public — post photos are meant to be visible to anyone who can see the
// post itself (the feed is public), so this deliberately has no auth check,
// unlike /api/vendor-documents/[id].
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [image] = await db.select().from(postImages).where(eq(postImages.id, id)).limit(1);
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
