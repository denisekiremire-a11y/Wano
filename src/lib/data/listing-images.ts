import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { listingImages } from "@/db/schema";

/** Image ids per listing, ordered by sortOrder — index 0 is the cover shown
 * on cards/grids. Bulk form for rendering a whole grid of listings without
 * one query per card. */
export async function getListingImageIds(listingIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (listingIds.length === 0) return map;
  const rows = await db
    .select({ id: listingImages.id, listingId: listingImages.listingId })
    .from(listingImages)
    .where(inArray(listingImages.listingId, listingIds))
    .orderBy(listingImages.sortOrder);
  for (const row of rows) {
    const list = map.get(row.listingId) ?? [];
    list.push(row.id);
    map.set(row.listingId, list);
  }
  return map;
}

export async function getListingImageIdsFor(listingId: string): Promise<string[]> {
  const map = await getListingImageIds([listingId]);
  return map.get(listingId) ?? [];
}
