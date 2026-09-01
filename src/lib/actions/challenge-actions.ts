"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { challengeCompletions } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";

export async function completeChallengeAction(challengeId: string) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) throw new Error("Traveller profile not found.");

  const [existing] = await db
    .select()
    .from(challengeCompletions)
    .where(
      and(
        eq(challengeCompletions.travellerId, travellerProfile.id),
        eq(challengeCompletions.challengeId, challengeId),
      ),
    )
    .limit(1);

  if (existing) {
    revalidatePath("/passport");
    return;
  }

  await db.insert(challengeCompletions).values({
    travellerId: travellerProfile.id,
    challengeId,
    status: "verified",
    completedAt: new Date(),
  });

  revalidatePath("/passport");
}
