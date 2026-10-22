"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { trailListings, trails } from "@/db/schema";
import { requireAdminLevel } from "@/lib/auth";
import { logAdminAction } from "@/lib/admin-action-log";
import { withRlsContext } from "@/lib/db-context";
import type { ActionState } from "@/lib/validation";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const trailSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().or(z.literal("")),
  bonusXp: z.coerce.number().int().min(0),
});

export async function createTrailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdminLevel("super");

  const parsed = trailSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    bonusXp: formData.get("bonusXp") || "0",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the trail fields." };

  const slug = slugify(parsed.data.name);
  const [existing] = await db.select({ id: trails.id }).from(trails).where(eq(trails.slug, slug)).limit(1);
  if (existing) return { error: "A trail with that name already exists." };

  const [created] = await withRlsContext({ role: "admin" }, (tx) =>
    tx
      .insert(trails)
      .values({
        slug,
        name: parsed.data.name,
        description: parsed.data.description || null,
        bonusXp: parsed.data.bonusXp,
      })
      .returning(),
  );
  await logAdminAction(session.userId, "trail.created", `Created trail "${parsed.data.name}"`, {
    type: "trail",
    id: created.id,
  });

  revalidatePath("/admin/trails");
  return {};
}

export async function updateTrailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdminLevel("super");

  const trailId = formData.get("trailId");
  if (typeof trailId !== "string" || !trailId) return { error: "Missing trail." };

  const parsed = trailSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    bonusXp: formData.get("bonusXp") || "0",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the trail fields." };

  const active = formData.get("active") === "on";

  const updated = await withRlsContext({ role: "admin" }, (tx) =>
    tx
      .update(trails)
      .set({
        name: parsed.data.name,
        description: parsed.data.description || null,
        bonusXp: parsed.data.bonusXp,
        active,
      })
      .where(eq(trails.id, trailId))
      .returning({ id: trails.id }),
  );
  if (updated.length === 0) return { error: "Trail not found." };

  await logAdminAction(session.userId, "trail.updated", `Updated trail "${parsed.data.name}"`, {
    type: "trail",
    id: trailId,
  });

  revalidatePath("/admin/trails");
  revalidatePath(`/admin/trails/${trailId}`);
  return {};
}

export async function attachListingToTrailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdminLevel("super");

  const trailId = formData.get("trailId");
  const listingId = formData.get("listingId");
  if (typeof trailId !== "string" || !trailId) return { error: "Missing trail." };
  if (typeof listingId !== "string" || !listingId) return { error: "Pick a listing." };

  const [existing] = await db
    .select({ id: trailListings.id })
    .from(trailListings)
    .where(and(eq(trailListings.trailId, trailId), eq(trailListings.listingId, listingId)))
    .limit(1);
  if (existing) return { error: "That listing is already on this trail." };

  await withRlsContext({ role: "admin" }, (tx) => tx.insert(trailListings).values({ trailId, listingId }));
  await logAdminAction(session.userId, "trail.listing_added", "Added a listing to a trail", {
    type: "trail",
    id: trailId,
  });

  revalidatePath(`/admin/trails/${trailId}`);
  return {};
}

export async function detachListingFromTrailAction(trailListingId: string) {
  const session = await requireAdminLevel("super");

  const [row] = await db.select().from(trailListings).where(eq(trailListings.id, trailListingId)).limit(1);
  if (!row) throw new Error("Not found.");

  await withRlsContext({ role: "admin" }, (tx) => tx.delete(trailListings).where(eq(trailListings.id, trailListingId)));
  await logAdminAction(session.userId, "trail.listing_removed", "Removed a listing from a trail", {
    type: "trail",
    id: row.trailId,
  });

  revalidatePath(`/admin/trails/${row.trailId}`);
}
