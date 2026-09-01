"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { journalPosts } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { generateJournalPublishedItem } from "@/lib/feed-generators";
import { slugify, uniqueSlug } from "@/lib/slug";
import type { ActionState } from "@/lib/validation";

async function journalSlugExists(candidate: string, excludeId?: string) {
  const rows = await db.select({ id: journalPosts.id }).from(journalPosts).where(eq(journalPosts.slug, candidate));
  return rows.some((r) => r.id !== excludeId);
}

const journalSchema = z.object({
  title: z.string().min(3).max(150),
  slug: z.string().max(100).optional().or(z.literal("")),
  excerpt: z.string().min(10).max(300),
  body: z.string().min(20),
  coverImage: z.string().url().max(500).optional().or(z.literal("")),
  authorUserId: z.string().uuid(),
  category: z.string().min(1).max(60),
  tags: z.string().optional().or(z.literal("")),
  status: z.enum(["draft", "scheduled", "published"]),
  publishedAt: z.string().optional().or(z.literal("")),
  seoTitle: z.string().max(70).optional().or(z.literal("")),
  seoDescription: z.string().max(160).optional().or(z.literal("")),
  ogImage: z.string().url().max(500).optional().or(z.literal("")),
});

function parseTags(raw: string | undefined) {
  return (raw ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function readForm(formData: FormData) {
  return journalSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug") ?? "",
    excerpt: formData.get("excerpt"),
    body: formData.get("body"),
    coverImage: formData.get("coverImage") ?? "",
    authorUserId: formData.get("authorUserId"),
    category: formData.get("category"),
    tags: formData.get("tags") ?? "",
    status: formData.get("status"),
    publishedAt: formData.get("publishedAt") ?? "",
    seoTitle: formData.get("seoTitle") ?? "",
    seoDescription: formData.get("seoDescription") ?? "",
    ogImage: formData.get("ogImage") ?? "",
  });
}

function resolvePublishedAt(status: string, publishedAtInput: string) {
  if (status === "draft") return null;
  if (publishedAtInput) return new Date(publishedAtInput);
  // "published" with no explicit date, or "scheduled" left blank — publish now.
  return new Date();
}

export async function createJournalPostAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");
  const parsed = readForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the post fields." };
  const d = parsed.data;

  const slug = await uniqueSlug(d.slug || d.title, (c) => journalSlugExists(slugify(c)));
  const status = d.status;
  const publishedAt = resolvePublishedAt(status, d.publishedAt || "");

  const [created] = await db
    .insert(journalPosts)
    .values({
      title: d.title,
      slug,
      excerpt: d.excerpt,
      body: d.body,
      coverImage: d.coverImage || null,
      authorUserId: d.authorUserId,
      category: d.category,
      tags: parseTags(d.tags),
      status,
      publishedAt,
      seoTitle: d.seoTitle || null,
      seoDescription: d.seoDescription || null,
      ogImage: d.ogImage || null,
    })
    .returning();

  if (status === "published" && publishedAt && publishedAt <= new Date()) {
    await generateJournalPublishedItem(created.id);
  }

  revalidatePath("/admin/journal");
  revalidatePath("/journal");
  redirect(`/admin/journal/${created.id}`);
}

export async function updateJournalPostAction(
  postId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("admin");
  const parsed = readForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the post fields." };
  const d = parsed.data;

  const slug = await uniqueSlug(d.slug || d.title, (c) => journalSlugExists(slugify(c), postId));
  const status = d.status;
  const publishedAt = resolvePublishedAt(status, d.publishedAt || "");

  await db
    .update(journalPosts)
    .set({
      title: d.title,
      slug,
      excerpt: d.excerpt,
      body: d.body,
      coverImage: d.coverImage || null,
      authorUserId: d.authorUserId,
      category: d.category,
      tags: parseTags(d.tags),
      status,
      publishedAt,
      seoTitle: d.seoTitle || null,
      seoDescription: d.seoDescription || null,
      ogImage: d.ogImage || null,
      updatedAt: new Date(),
    })
    .where(eq(journalPosts.id, postId));

  if (status === "published" && publishedAt && publishedAt <= new Date()) {
    await generateJournalPublishedItem(postId);
  }

  revalidatePath("/admin/journal");
  revalidatePath(`/admin/journal/${postId}`);
  revalidatePath("/journal");
  revalidatePath(`/journal/${slug}`);
  return {};
}

export async function deleteJournalPostAction(postId: string) {
  await requireRole("admin");
  await db.delete(journalPosts).where(eq(journalPosts.id, postId));
  revalidatePath("/admin/journal");
  revalidatePath("/journal");
}
