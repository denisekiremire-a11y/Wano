"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { blocks, moderationActions, posts, reports } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { generateUserPostItem } from "@/lib/feed-generators";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { countInLastHour, RATE_LIMITS } from "@/lib/rate-limit";

/** Reports on one target that auto-hide it, pending review — configurable
 * per the milestone brief's "both thresholds configurable" instruction. */
const AUTO_HIDE_REPORT_THRESHOLD = 3;

export type ReportTargetType = "post" | "comment" | "user" | "review";
export type ReportReason = "spam" | "harassment" | "inappropriate" | "fake" | "other";

export async function createReportAction(targetType: ReportTargetType, targetId: string, reason: ReportReason) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) throw new Error("Traveller profile not found.");

  const recentReports = await countInLastHour(reports, reports.reporterId, reports.createdAt, travellerProfile.id);
  if (recentReports >= RATE_LIMITS.reportsPerHour) {
    throw new Error("You're reporting a lot right now — try again in a bit.");
  }

  await db.insert(reports).values({
    reporterId: travellerProfile.id,
    targetType,
    targetId,
    reason,
  });

  // Auto-hide: only meaningful for posts today (the only moderated
  // content with a status column) — comments/users/reviews still land in
  // the queue, just without an automatic action.
  if (targetType === "post") {
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(reports)
      .where(and(eq(reports.targetType, "post"), eq(reports.targetId, targetId), eq(reports.status, "open")));

    if (total >= AUTO_HIDE_REPORT_THRESHOLD) {
      const [post] = await db.select().from(posts).where(eq(posts.id, targetId)).limit(1);
      if (post && post.status === "visible") {
        await db.update(posts).set({ status: "hidden" }).where(eq(posts.id, targetId));
        await db.insert(moderationActions).values({
          targetType: "post",
          targetId,
          action: "hide",
          reason: `Auto-hidden after ${total} reports`,
          performedByUserId: session.userId,
        });
      }
    }
  }

  revalidatePath("/social");
  revalidatePath("/admin/moderation");
}

export async function blockUserAction(blockedTravellerId: string) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) throw new Error("Traveller profile not found.");
  if (travellerProfile.id === blockedTravellerId) return;

  const [existing] = await db
    .select()
    .from(blocks)
    .where(and(eq(blocks.blockerId, travellerProfile.id), eq(blocks.blockedId, blockedTravellerId)))
    .limit(1);
  if (!existing) {
    await db.insert(blocks).values({ blockerId: travellerProfile.id, blockedId: blockedTravellerId });
  }

  revalidatePath("/social");
}

export async function unblockUserAction(blockedTravellerId: string) {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) throw new Error("Traveller profile not found.");

  await db
    .delete(blocks)
    .where(and(eq(blocks.blockerId, travellerProfile.id), eq(blocks.blockedId, blockedTravellerId)));

  revalidatePath("/social");
  revalidatePath("/passport");
}

// --- Admin moderation queue actions ---

export async function resolveReportAction(
  reportId: string,
  action: "dismiss" | "hide" | "remove" | "warn" | "suspend",
) {
  const session = await requireRole("admin");

  const [report] = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
  if (!report) throw new Error("Report not found.");

  if (action === "hide" || action === "remove") {
    if (report.targetType === "post") {
      await db
        .update(posts)
        .set({ status: action === "hide" ? "hidden" : "removed" })
        .where(eq(posts.id, report.targetId));
    } else if (report.targetType === "comment") {
      // Comments have no status column to hide-but-keep — both actions
      // just delete the row.
      const { postComments } = await import("@/db/schema");
      await db.delete(postComments).where(eq(postComments.id, report.targetId));
    }
  }

  if (action === "suspend" && report.targetType === "user") {
    // targetId for a "user" report is a travellerProfiles.id (see
    // getUserForModeration) — same id space blocks use.
    const { travellerProfiles, users } = await import("@/db/schema");
    const [traveller] = await db
      .select({ userId: travellerProfiles.userId })
      .from(travellerProfiles)
      .where(eq(travellerProfiles.id, report.targetId))
      .limit(1);
    if (traveller) {
      await db.update(users).set({ suspendedAt: new Date() }).where(eq(users.id, traveller.userId));
    }
  }

  await db
    .update(reports)
    .set({
      status: action === "dismiss" ? "dismissed" : "actioned",
      resolvedByUserId: session.userId,
      resolvedAt: new Date(),
    })
    .where(eq(reports.id, reportId));

  await db.insert(moderationActions).values({
    reportId,
    targetType: report.targetType,
    targetId: report.targetId,
    action,
    performedByUserId: session.userId,
  });

  revalidatePath("/admin/moderation");
  revalidatePath("/social");
}

/** Approve or remove a post sitting in pending_review (new-account
 * auto-flag) — separate from report resolution since it has no report row. */
export async function reviewPendingPostAction(postId: string, decision: "approve" | "remove") {
  const session = await requireRole("admin");
  const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post) throw new Error("Post not found.");

  await db
    .update(posts)
    .set({ status: decision === "approve" ? "visible" : "removed" })
    .where(eq(posts.id, postId));

  if (decision === "approve") {
    const { travellerProfiles } = await import("@/db/schema");
    const [traveller] = await db.select().from(travellerProfiles).where(eq(travellerProfiles.id, post.travellerId)).limit(1);
    if (traveller) await generateUserPostItem(post.id, traveller.id, traveller.displayName);
  }

  await db.insert(moderationActions).values({
    targetType: "post",
    targetId: postId,
    action: decision === "approve" ? "dismiss" : "remove",
    reason: "New-account first post review",
    performedByUserId: session.userId,
  });

  revalidatePath("/admin/moderation");
  revalidatePath("/social");
}
