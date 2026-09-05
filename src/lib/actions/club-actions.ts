"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { clubs } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { hasUpcomingMeetup } from "@/lib/data/social";
import { getVendorProfileByUserId } from "@/lib/data/vendor";
import { notifyAdmin } from "@/lib/notify";
import { uniqueSlug } from "@/lib/slug";
import type { ActionState } from "@/lib/validation";

async function clubSlugExists(candidate: string) {
  const [existing] = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.slug, candidate)).limit(1);
  return Boolean(existing);
}

const clubSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(600),
  interestId: z.string().uuid(),
});

/** A vendor submitting their own business's club — starts "pending" until
 * an admin reviews it. The submitting vendor is automatically the club's
 * "run by" partner. */
export async function submitClubAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return { error: "Vendor profile not found." };

  const parsed = clubSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    interestId: formData.get("interestId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the club details." };
  }

  const slug = await uniqueSlug(parsed.data.name, clubSlugExists);
  await db.insert(clubs).values({
    ...parsed.data,
    slug,
    vendorProfileId: vendorProfile.id,
    createdByUserId: session.userId,
    status: "pending",
  });

  await notifyAdmin("New club submission", [
    `<strong>${vendorProfile.businessName}</strong> submitted a club: ${parsed.data.name}`,
  ]);

  revalidatePath("/vendor/dashboard/clubs");
  revalidatePath("/admin/clubs");
  return {};
}

/** The public "Start a club" application form — category, name, why, how
 * often, host contact. Lands in the same admin review queue as a vendor
 * submission; an admin fleshes it out (host account, cover image, first
 * meetup) before it can be approved. */
const applicationSchema = z.object({
  interestId: z.string().uuid(),
  name: z.string().min(2).max(100),
  why: z.string().min(10).max(600),
  cadence: z.string().min(2).max(100),
  contact: z.string().min(3).max(200),
});

export async function applyToStartClubAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("traveller");

  const parsed = applicationSchema.safeParse({
    interestId: formData.get("interestId"),
    name: formData.get("name"),
    why: formData.get("why"),
    cadence: formData.get("cadence"),
    contact: formData.get("contact"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the application fields." };
  }

  const slug = await uniqueSlug(parsed.data.name, clubSlugExists);
  await db.insert(clubs).values({
    name: parsed.data.name,
    slug,
    description: parsed.data.why,
    interestId: parsed.data.interestId,
    cadence: parsed.data.cadence,
    applicantContact: parsed.data.contact,
    createdByUserId: session.userId,
    status: "pending",
  });

  await notifyAdmin("New \"Start a club\" application", [
    `Someone applied to start a club: <strong>${parsed.data.name}</strong>`,
    `Cadence: ${parsed.data.cadence}`,
    `Contact: ${parsed.data.contact}`,
  ]);

  revalidatePath("/admin/clubs");
  return {};
}

/** Admin creating a club directly. Always starts "pending" — even an
 * admin-authored club needs a scheduled meetup before reviewClubAction can
 * publish it, so there's exactly one place that gate is enforced. */
const adminClubSchema = clubSchema.extend({
  vendorProfileId: z.string().uuid().optional().or(z.literal("")),
  hostUserId: z.string().uuid().optional().or(z.literal("")),
  coverImage: z.string().url().max(500).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  cadence: z.string().max(100).optional().or(z.literal("")),
  whatsappInviteUrl: z.string().url().max(500).optional().or(z.literal("")),
});

export async function createClubAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("admin");

  const parsed = adminClubSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    interestId: formData.get("interestId"),
    vendorProfileId: formData.get("vendorProfileId") ?? "",
    hostUserId: formData.get("hostUserId") ?? "",
    coverImage: formData.get("coverImage") ?? "",
    city: formData.get("city") ?? "",
    cadence: formData.get("cadence") ?? "",
    whatsappInviteUrl: formData.get("whatsappInviteUrl") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the club details." };
  }

  const slug = await uniqueSlug(parsed.data.name, clubSlugExists);
  await db.insert(clubs).values({
    name: parsed.data.name,
    slug,
    description: parsed.data.description,
    interestId: parsed.data.interestId,
    vendorProfileId: parsed.data.vendorProfileId || null,
    hostUserId: parsed.data.hostUserId || null,
    coverImage: parsed.data.coverImage || null,
    city: parsed.data.city || null,
    cadence: parsed.data.cadence || null,
    whatsappInviteUrl: parsed.data.whatsappInviteUrl || null,
    createdByUserId: session.userId,
    status: "pending",
  });

  revalidatePath("/admin/clubs");
  return {};
}

/** Fills in the operational details an application didn't collect (host,
 * cover image, WhatsApp link) — used before approving. */
const detailsSchema = z.object({
  hostUserId: z.string().uuid().optional().or(z.literal("")),
  coverImage: z.string().url().max(500).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  cadence: z.string().max(100).optional().or(z.literal("")),
  whatsappInviteUrl: z.string().url().max(500).optional().or(z.literal("")),
});

export async function updateClubDetailsAction(
  clubId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("admin");
  const parsed = detailsSchema.safeParse({
    hostUserId: formData.get("hostUserId") ?? "",
    coverImage: formData.get("coverImage") ?? "",
    city: formData.get("city") ?? "",
    cadence: formData.get("cadence") ?? "",
    whatsappInviteUrl: formData.get("whatsappInviteUrl") ?? "",
  });
  if (!parsed.success) return { error: "Please check the club details." };

  await db
    .update(clubs)
    .set({
      hostUserId: parsed.data.hostUserId || null,
      coverImage: parsed.data.coverImage || null,
      city: parsed.data.city || null,
      cadence: parsed.data.cadence || null,
      whatsappInviteUrl: parsed.data.whatsappInviteUrl || null,
    })
    .where(eq(clubs.id, clubId));

  revalidatePath(`/admin/clubs`);
  revalidatePath(`/social/clubs/${clubId}`);
  return {};
}

export async function reviewClubAction(clubId: string, status: "approved" | "rejected", notes?: string) {
  const session = await requireRole("admin");

  if (status === "approved") {
    const [club] = await db.select().from(clubs).where(eq(clubs.id, clubId)).limit(1);
    if (!club?.hostUserId) {
      throw new Error("Assign a host before publishing this club.");
    }
    if (!(await hasUpcomingMeetup(clubId))) {
      throw new Error("Schedule a future meetup before publishing this club.");
    }
  }

  await db
    .update(clubs)
    .set({ status, reviewedByUserId: session.userId, reviewNotes: notes || null })
    .where(eq(clubs.id, clubId));

  revalidatePath("/admin/clubs");
  revalidatePath("/vendor/dashboard/clubs");
  revalidatePath("/social");
}
