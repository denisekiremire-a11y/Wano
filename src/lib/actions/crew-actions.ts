"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { containsProfanity } from "@/lib/profanity";
import {
  createCrew,
  CrewError,
  joinCrew,
  leaveCrew,
  removeCrewMember,
  renameCrew,
  resetCrewInvite,
} from "@/lib/data/crews";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";

type State = { error?: string } | undefined;

async function me() {
  const session = await requireRole("traveller");
  const traveller = await getTravellerProfileByUserId(session.userId);
  if (!traveller) throw new Error("Traveller profile not found.");
  return traveller;
}

/** Runs a crew change and turns expected refusals into a form error. */
async function attempt(fn: () => Promise<unknown>): Promise<State> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof CrewError) return { error: e.message };
    throw e;
  }
  revalidatePath("/crew");
  revalidatePath("/passport");
  return {};
}

function checkName(name: string) {
  if (containsProfanity(name)) throw new CrewError("Please pick a different name.");
  return name;
}

export async function createCrewAction(_prev: State, formData: FormData): Promise<State> {
  const traveller = await me();
  const name = String(formData.get("name") ?? "");
  const result = await attempt(() => createCrew(traveller.id, checkName(name)));
  if (result?.error) return result;
  redirect("/crew");
}

export async function joinCrewAction(token: string): Promise<State> {
  const traveller = await me();
  const result = await attempt(() => joinCrew(traveller.id, token));
  if (result?.error) return result;
  redirect("/crew");
}

export async function leaveCrewAction() {
  const traveller = await me();
  await leaveCrew(traveller.id);
  revalidatePath("/passport");
  redirect("/crew");
}

export async function removeCrewMemberAction(memberId: string): Promise<State> {
  const traveller = await me();
  return attempt(() => removeCrewMember(traveller.id, memberId));
}

export async function renameCrewAction(_prev: State, formData: FormData): Promise<State> {
  const traveller = await me();
  const name = String(formData.get("name") ?? "");
  return attempt(() => renameCrew(traveller.id, checkName(name)));
}

export async function resetCrewInviteAction(): Promise<State> {
  const traveller = await me();
  return attempt(() => resetCrewInvite(traveller.id));
}
