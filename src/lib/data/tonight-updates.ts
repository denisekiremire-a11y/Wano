import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { listings, vendorProfiles, vendorTonightUpdates } from "@/db/schema";
import { kampalaDateIso } from "@/lib/drops";
import { listingPublishConditions } from "@/lib/listing-publish";

export const TONIGHT_UPDATE_MAX = 140;

/** Today's partner lines for the home page: verified venues only, newest
 * first, each linking to one of the venue's published listings. */
export async function getTonightUpdates(now = new Date(), limit = 6) {
  const rows = await db
    .select({
      id: vendorTonightUpdates.id,
      text: vendorTonightUpdates.text,
      vendorName: vendorProfiles.businessName,
      location: vendorProfiles.location,
      listingId: sql<string | null>`(
        select ${listings.id} from ${listings}
        where ${listings.vendorProfileId} = ${vendorProfiles.id}
          and ${and(...listingPublishConditions)}
        order by ${listings.createdAt} asc limit 1
      )`,
    })
    .from(vendorTonightUpdates)
    .innerJoin(vendorProfiles, eq(vendorProfiles.id, vendorTonightUpdates.vendorProfileId))
    .where(
      and(eq(vendorTonightUpdates.kampalaDate, kampalaDateIso(now)), eq(vendorProfiles.accreditationStatus, "trusted")),
    )
    .orderBy(desc(vendorTonightUpdates.updatedAt))
    .limit(limit);
  return rows;
}

export async function getMyTonightUpdate(vendorProfileId: string, now = new Date()) {
  const [row] = await db
    .select()
    .from(vendorTonightUpdates)
    .where(
      and(eq(vendorTonightUpdates.vendorProfileId, vendorProfileId), eq(vendorTonightUpdates.kampalaDate, kampalaDateIso(now))),
    )
    .limit(1);
  return row ?? null;
}

export async function setTonightUpdate(vendorProfileId: string, text: string | null, now = new Date()) {
  const kampalaDate = kampalaDateIso(now);
  if (!text) {
    await db
      .delete(vendorTonightUpdates)
      .where(and(eq(vendorTonightUpdates.vendorProfileId, vendorProfileId), eq(vendorTonightUpdates.kampalaDate, kampalaDate)));
    return;
  }
  await db
    .insert(vendorTonightUpdates)
    .values({ vendorProfileId, kampalaDate, text, updatedAt: now })
    .onConflictDoUpdate({
      target: [vendorTonightUpdates.vendorProfileId, vendorTonightUpdates.kampalaDate],
      set: { text, updatedAt: now },
    });
}
