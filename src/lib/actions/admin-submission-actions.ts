"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { vendorSubmissions } from "@/db/schema";
import { applyListingContent, applyVendorSocialLinks, listingContentSchema } from "@/lib/actions/listing-shared";
import { applyVendorRewardContent, vendorRewardContentSchema } from "@/lib/actions/reward-actions";
import { requireRole } from "@/lib/auth";
import { getSubmissionById, getVendorUserEmail } from "@/lib/data/submissions";
import { notifyUser } from "@/lib/notify";

function revalidateSubmissionPaths() {
  revalidatePath("/admin/submissions");
  revalidatePath("/vendor/dashboard/listings");
  revalidatePath("/vendor/dashboard/rewards");
  revalidatePath("/explore");
  revalidatePath("/partners");
  revalidatePath("/passport");
}

export async function approveSubmissionAction(submissionId: string) {
  const session = await requireRole("admin");

  const submission = await getSubmissionById(submissionId);
  if (!submission || submission.status !== "pending") throw new Error("Submission not found.");

  let entityLabel = "";
  if (submission.entityType === "listing") {
    const parsed = listingContentSchema.safeParse(submission.payload);
    if (!parsed.success) throw new Error("This submission's content no longer validates — ask the vendor to resubmit.");
    await applyVendorSocialLinks(submission.vendorProfileId, parsed.data);
    // A brand-new listing has no isPublished/active set by this path — the
    // schema default (true) already applies at insert time, same as any
    // other new row, so nothing further to flip here.
    await applyListingContent(submission.entityId, submission.vendorProfileId, parsed.data);
    entityLabel = parsed.data.title;
  } else {
    const parsed = vendorRewardContentSchema.safeParse(submission.payload);
    if (!parsed.success) throw new Error("This submission's content no longer validates — ask the vendor to resubmit.");
    await applyVendorRewardContent(submission.entityId, parsed.data);
    entityLabel = parsed.data.title;
  }

  await db
    .update(vendorSubmissions)
    .set({ status: "approved", reviewedByUserId: session.userId, reviewedAt: new Date(), reviewNotes: null })
    .where(eq(vendorSubmissions.id, submissionId));

  const vendor = await getVendorUserEmail(submission.vendorProfileId);
  if (vendor) {
    await notifyUser(vendor.email, "Your submission was approved", [
      `<strong>${entityLabel}</strong> is now live on Wano.`,
    ]);
  }

  revalidateSubmissionPaths();
}

export async function rejectSubmissionAction(submissionId: string, notes: string) {
  const session = await requireRole("admin");

  const submission = await getSubmissionById(submissionId);
  if (!submission || submission.status !== "pending") throw new Error("Submission not found.");

  await db
    .update(vendorSubmissions)
    .set({ status: "rejected", reviewedByUserId: session.userId, reviewedAt: new Date(), reviewNotes: notes || null })
    .where(eq(vendorSubmissions.id, submissionId));

  const vendor = await getVendorUserEmail(submission.vendorProfileId);
  const title = typeof submission.payload.title === "string" ? submission.payload.title : "your submission";
  if (vendor) {
    await notifyUser(vendor.email, "Your submission needs changes", [
      `<strong>${title}</strong> wasn't approved this time.`,
      ...(notes ? [`Notes: ${notes}`] : []),
    ]);
  }

  revalidateSubmissionPaths();
}
