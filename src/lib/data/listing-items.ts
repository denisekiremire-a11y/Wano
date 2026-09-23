import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { listingItemImages, listingItems } from "@/db/schema";

export type ListingItem = typeof listingItems.$inferSelect;

/** Active items for one listing, ordered by sortOrder — the menu/services/
 * rooms/vehicles/tickets a traveller picks from before or during booking. */
export async function getListingItems(listingId: string): Promise<ListingItem[]> {
  return db
    .select()
    .from(listingItems)
    .where(eq(listingItems.listingId, listingId))
    .orderBy(listingItems.sortOrder);
}

export async function getListingItemById(itemId: string): Promise<ListingItem | undefined> {
  const [item] = await db.select().from(listingItems).where(eq(listingItems.id, itemId)).limit(1);
  return item;
}

/** Image ids per item, ordered by sortOrder — index 0 is the cover shown on
 * item cards. Bulk form mirrors getListingImageIds. */
export async function getListingItemImageIds(itemIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (itemIds.length === 0) return map;
  const rows = await db
    .select({ id: listingItemImages.id, itemId: listingItemImages.itemId })
    .from(listingItemImages)
    .where(inArray(listingItemImages.itemId, itemIds))
    .orderBy(listingItemImages.sortOrder);
  for (const row of rows) {
    const list = map.get(row.itemId) ?? [];
    list.push(row.id);
    map.set(row.itemId, list);
  }
  return map;
}

export async function getListingItemImageIdsFor(itemId: string): Promise<string[]> {
  const map = await getListingItemImageIds([itemId]);
  return map.get(itemId) ?? [];
}
