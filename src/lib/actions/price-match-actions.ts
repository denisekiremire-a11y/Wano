"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, priceMatchReports } from "@/db/schema";
import { withRlsContext } from "@/lib/db-context";
import { requireAdminLevel, requireRole } from "@/lib/auth";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { addManualPointsAdjustment } from "@/lib/data/points";
import { logAdminAction } from "@/lib/admin-action-log";
import type { ActionState } from "@/lib/validation";

const detailsMax = 1000;

/** A traveller reporting they found a cheaper direct price for a booking
 * they already made — review happens in the admin reserve/price-match
 * surface, which credits any difference via the existing
 * addManualPointsAdjustment. Only confirmed/completed bookings qualify:
 * there's no "cheaper elsewhere" to match against a booking that was
 * never actually paid for. */
export async function submitPriceMatchReportAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Traveller profile not found." };

  const bookingId = formData.get("bookingId");
  if (typeof bookingId !== "string" || !bookingId) return { error: "Missing booking." };

  const details = String(formData.get("details") ?? "").trim().slice(0, detailsMax);
  if (!details) return { error: "Describe the cheaper price you found." };

  const [booking] = await db
    .select({ travellerId: bookings.travellerId, status: bookings.status })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking || booking.travellerId !== travellerProfile.id) return { error: "Booking not found." };
  if (booking.status !== "confirmed" && booking.status !== "completed") {
    return { error: "Only a confirmed booking can be price-matched." };
  }

  await withRlsContext({ role: "admin" }, (tx) =>
    tx.insert(priceMatchReports).values({
      bookingId,
      travellerId: travellerProfile.id,
      details,
    }),
  );

  return {};
}

/** Admin review of a price-match report (super, see admin-permissions.ts).
 * Crediting reuses addManualPointsAdjustment exactly as-is — this action
 * only ever decides *whether* to credit and records the report's outcome,
 * no new points-crediting logic. */
export async function reviewPriceMatchReportAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdminLevel("super");

  const reportId = formData.get("reportId");
  if (typeof reportId !== "string" || !reportId) return { error: "Missing report." };

  const decision = formData.get("decision");
  if (decision !== "credit" && decision !== "decline") return { error: "Choose credit or decline." };

  const [report] = await withRlsContext({ role: "admin" }, (tx) =>
    tx
      .select()
      .from(priceMatchReports)
      .where(and(eq(priceMatchReports.id, reportId), eq(priceMatchReports.status, "pending")))
      .limit(1),
  );
  if (!report) return { error: "That report has already been reviewed." };

  let creditedPoints: number | null = null;
  if (decision === "credit") {
    const points = Number(formData.get("creditedPoints"));
    if (!Number.isInteger(points) || points <= 0) return { error: "Enter a valid number of points to credit." };
    creditedPoints = points;
    await addManualPointsAdjustment(
      session.userId,
      report.travellerId,
      points,
      `Price match: ${report.details.slice(0, 200)}`,
    );
  }

  await withRlsContext({ role: "admin" }, (tx) =>
    tx
      .update(priceMatchReports)
      .set({
        status: "reviewed",
        creditedPoints,
        reviewedByUserId: session.userId,
        reviewedAt: new Date(),
      })
      .where(eq(priceMatchReports.id, reportId)),
  );

  await logAdminAction(
    session.userId,
    "price_match.reviewed",
    decision === "credit" ? `Price match credited: ${creditedPoints} points` : "Price match declined",
    { type: "price_match_report", id: reportId },
  );

  return {};
}
