import { eq } from "drizzle-orm";
import { db } from "@/db";
import { interests, travellerInterests } from "@/db/schema";

export async function getAllInterests() {
  return db.select().from(interests).orderBy(interests.sortOrder);
}

export async function getTravellerInterestIds(travellerId: string) {
  const rows = await db
    .select({ interestId: travellerInterests.interestId })
    .from(travellerInterests)
    .where(eq(travellerInterests.travellerId, travellerId));
  return new Set(rows.map((r) => r.interestId));
}
