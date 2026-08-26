"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { travellerInterests } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";

export async function saveInterestsAction(formData: FormData) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) throw new Error("Traveller profile not found.");

  const interestIds = formData.getAll("interestIds").map(String).filter(Boolean);

  await db.delete(travellerInterests).where(eq(travellerInterests.travellerId, travellerProfile.id));
  if (interestIds.length > 0) {
    await db
      .insert(travellerInterests)
      .values(interestIds.map((interestId) => ({ travellerId: travellerProfile.id, interestId })));
  }

  redirect("/home");
}
