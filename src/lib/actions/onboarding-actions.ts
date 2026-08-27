"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { travellerInterests, travellerProfiles } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/analytics";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";

const PERSONAS = new Set(["newcomer", "tourist", "local"]);

export async function savePersonaAction(formData: FormData) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) throw new Error("Traveller profile not found.");

  const persona = formData.get("persona");
  if (typeof persona !== "string" || !PERSONAS.has(persona)) {
    redirect("/onboarding");
  }

  await db
    .update(travellerProfiles)
    .set({ persona: persona as "newcomer" | "tourist" | "local" })
    .where(eq(travellerProfiles.id, travellerProfile.id));

  await logEvent("onboarding_started", { userId: session.userId, role: session.role, metadata: { persona } });
  redirect("/onboarding/city");
}

export async function saveCityAction(formData: FormData) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) throw new Error("Traveller profile not found.");

  const city = formData.get("city");
  if (typeof city !== "string" || !city.trim()) {
    redirect("/onboarding/city");
  }

  await db
    .update(travellerProfiles)
    .set({ city: (city as string).trim().slice(0, 80) })
    .where(eq(travellerProfiles.id, travellerProfile.id));

  redirect("/onboarding/interests");
}

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

  await logEvent("onboarding_completed", { userId: session.userId, role: session.role });
  redirect("/onboarding/done");
}
