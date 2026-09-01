"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { savedListings } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";

export async function toggleSavedListingAction(listingId: string) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) throw new Error("Traveller profile not found.");

  const [existing] = await db
    .select()
    .from(savedListings)
    .where(
      and(eq(savedListings.travellerId, travellerProfile.id), eq(savedListings.listingId, listingId)),
    )
    .limit(1);

  if (existing) {
    await db.delete(savedListings).where(eq(savedListings.id, existing.id));
  } else {
    await db.insert(savedListings).values({ travellerId: travellerProfile.id, listingId });
  }

  revalidatePath("/passport");
  revalidatePath("/explore");
}
