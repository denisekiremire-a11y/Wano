"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { challengeCompletions } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { awardPoints } from "@/lib/data/points";
import { CHALLENGE_XP } from "@/lib/rewards-config";

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

  const [completion] = await db
    .insert(challengeCompletions)
    .values({
      travellerId: travellerProfile.id,
      challengeId,
      status: "verified",
      completedAt: new Date(),
    })
    .returning({ id: challengeCompletions.id });
  await awardPoints({
    travellerId: travellerProfile.id,
    delta: CHALLENGE_XP,
    sourceType: "challenge",
    sourceId: completion.id,
    reason: "Challenge completed",
  });

  revalidatePath("/passport");
}
