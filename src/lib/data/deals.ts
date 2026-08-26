import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dealClaims, journeys, listings, promoCodes, vendorProfiles } from "@/db/schema";

export async function getAllActiveDeals() {
  return db
    .select({ promo: promoCodes, journey: journeys, listing: listings, vendor: vendorProfiles })
    .from(promoCodes)
    .leftJoin(journeys, eq(promoCodes.journeyId, journeys.id))
    .leftJoin(listings, eq(promoCodes.listingId, listings.id))
    .leftJoin(vendorProfiles, eq(listings.vendorProfileId, vendorProfiles.id))
    .where(eq(promoCodes.active, true));
}

export async function getClaimedDealIds(travellerId: string) {
  const rows = await db
    .select({ promoCodeId: dealClaims.promoCodeId })
    .from(dealClaims)
    .where(eq(dealClaims.travellerId, travellerId));
  return new Set(rows.map((r) => r.promoCodeId));
}

export async function getMyClaimedDeals(travellerId: string) {
  return db
    .select({ promo: promoCodes, claim: dealClaims })
    .from(dealClaims)
    .innerJoin(promoCodes, eq(promoCodes.id, dealClaims.promoCodeId))
    .where(eq(dealClaims.travellerId, travellerId));
}
