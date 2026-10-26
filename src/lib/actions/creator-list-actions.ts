"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { travellerProfiles } from "@/db/schema";
import { ADMIN_MIN_LEVEL } from "@/lib/admin-permissions";
import { logAdminAction } from "@/lib/admin-action-log";
import { requireAdminLevel, requireRole } from "@/lib/auth";
import { withRlsContext } from "@/lib/db-context";
import {
  addCreatorListItem,
  createCreatorList,
  CreatorListError,
  removeCreatorListItem,
  reviewCreatorList,
  submitCreatorList,
  unpublishCreatorList,
  updateCreatorList,
  withdrawCreatorList,
} from "@/lib/data/creator-lists";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { notifyAdmin } from "@/lib/notify";
import { containsProfanity } from "@/lib/profanity";

type State = { error?: string; ok?: boolean } | undefined;

async function me() {
  const session = await requireRole("traveller");
  const traveller = await getTravellerProfileByUserId(session.userId);
  if (!traveller) throw new Error("Traveller profile not found.");
  return traveller;
}

async function attempt(fn: () => Promise<unknown>, paths: string[]): Promise<State> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof CreatorListError) return { error: e.message };
    throw e;
  }
  for (const p of paths) revalidatePath(p);
  return { ok: true };
}

function details(formData: FormData) {
  const input = {
    title: String(formData.get("title") ?? ""),
    intro: String(formData.get("intro") ?? ""),
    area: String(formData.get("area") ?? ""),
  };
  if (containsProfanity(`${input.title} ${input.intro} ${input.area}`)) {
    throw new CreatorListError("Please keep the wording clean.");
  }
  return input;
}

export async function createCreatorListAction(_prev: State, formData: FormData): Promise<State> {
  const traveller = await me();
  let id = "";
  const result = await attempt(async () => {
    id = (await createCreatorList(traveller.id, details(formData))).id;
  }, ["/creator/lists"]);
  if (result?.error) return result;
  redirect(`/creator/lists/${id}`);
}

export async function updateCreatorListAction(listId: string, _prev: State, formData: FormData): Promise<State> {
  const traveller = await me();
  return attempt(() => updateCreatorList(traveller.id, listId, details(formData)), [`/creator/lists/${listId}`]);
}

export async function addCreatorListItemAction(listId: string, _prev: State, formData: FormData): Promise<State> {
  const traveller = await me();
  const pick = String(formData.get("pick") ?? "");
  const [kind, id] = pick.split(":");
  const note = String(formData.get("note") ?? "");
  return attempt(async () => {
    if (containsProfanity(note)) throw new CreatorListError("Please keep the wording clean.");
    await addCreatorListItem(traveller.id, listId, {
      listingId: kind === "listing" ? id : null,
      eventId: kind === "event" ? id : null,
      note,
    });
  }, [`/creator/lists/${listId}`]);
}

export async function removeCreatorListItemAction(listId: string, itemId: string) {
  const traveller = await me();
  await removeCreatorListItem(traveller.id, listId, itemId);
  revalidatePath(`/creator/lists/${listId}`);
}

export async function submitCreatorListAction(listId: string): Promise<State> {
  const traveller = await me();
  const result = await attempt(() => submitCreatorList(traveller.id, listId), [`/creator/lists/${listId}`, "/creator/lists", "/admin/creators"]);
  if (result?.ok) await notifyAdmin("Creator list to review", [`${traveller.displayName} sent a list for review.`, "Open Admin → Creator lists."]);
  return result;
}

export async function withdrawCreatorListAction(listId: string) {
  const traveller = await me();
  await withdrawCreatorList(traveller.id, listId);
  revalidatePath(`/creator/lists/${listId}`);
  revalidatePath("/lists");
}

// ── Admin ────────────────────────────────────────────────────────────

export async function reviewCreatorListAction(
  listId: string,
  decision: "publish" | "reject",
  _prev: State,
  formData: FormData,
): Promise<State> {
  const session = await requireAdminLevel(ADMIN_MIN_LEVEL["/admin/creators"]);
  const note = String(formData.get("note") ?? "");
  let title = "";
  const result = await attempt(async () => {
    title = (await reviewCreatorList(listId, decision, note)).title;
  }, ["/admin/creators", "/lists", `/creator/lists/${listId}`]);
  if (result?.ok) {
    await logAdminAction(
      session.userId,
      decision === "publish" ? "creator_list.published" : "creator_list.rejected",
      `${decision === "publish" ? "Published" : "Sent back"} creator list "${title}"`,
      { type: "creator_list", id: listId },
    );
  }
  return result;
}

export async function unpublishCreatorListAction(listId: string) {
  const session = await requireAdminLevel(ADMIN_MIN_LEVEL["/admin/creators"]);
  await unpublishCreatorList(listId);
  await logAdminAction(session.userId, "creator_list.unpublished", "Took down a creator list", { type: "creator_list", id: listId });
  revalidatePath("/admin/creators");
  revalidatePath("/lists");
}

/** Add someone to, or remove them from, the creator programme. */
export async function setCreatorAction(travellerId: string, on: boolean) {
  const session = await requireAdminLevel(ADMIN_MIN_LEVEL["travellers:write"]);
  await withRlsContext({ userId: session.userId, role: "admin" }, (tx) =>
    tx
      .update(travellerProfiles)
      .set({ creatorApprovedAt: on ? new Date() : null })
      .where(eq(travellerProfiles.id, travellerId)),
  );
  await logAdminAction(
    session.userId,
    on ? "traveller.creator_added" : "traveller.creator_removed",
    on ? "Added a member to the creator programme" : "Removed a member from the creator programme",
    { type: "traveller_profile", id: travellerId },
  );
  revalidatePath(`/admin/travellers/${travellerId}`);
  revalidatePath("/admin/creators");
  revalidatePath("/lists");
}
