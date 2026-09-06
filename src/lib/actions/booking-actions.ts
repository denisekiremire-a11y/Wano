"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { bookings, listingJourneys, listings, userRewards } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/analytics";
import { notifyVendorOfNewBooking } from "@/lib/booking-notifications";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";

function generateBookingRef() {
  return `PAM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function bookListingFormAction(formData: FormData) {
  const listingId = formData.get("listingId");
  if (typeof listingId !== "string" || !listingId) {
    throw new Error("Missing listing.");
  }
  // The journey context the traveller booked *from* — a listing can be
  // tagged to several journeys, so the stamp goes to whichever one they
  // actually engaged with. Absent/invalid means a general (non-journey)
  // booking that earns no stamp.
  const requestedJourneyId = formData.get("journeyId");
  const rawVisitDate = formData.get("visitDate");
  const rawVisitTime = formData.get("visitTime");
  const rawPartySize = formData.get("partySize");
  const rawBookingName = formData.get("bookingName");
  const rawNotes = formData.get("notes");
  const rawUserRewardId = formData.get("userRewardId");
  const visitDate =
    typeof rawVisitDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawVisitDate) ? rawVisitDate : null;
  const visitTime =
    typeof rawVisitTime === "string" && /^\d{2}:\d{2}$/.test(rawVisitTime) ? rawVisitTime : null;
  const partySize =
    typeof rawPartySize === "string" && rawPartySize.trim() ? Number(rawPartySize) : null;
  const bookingName = typeof rawBookingName === "string" && rawBookingName.trim() ? rawBookingName.trim() : null;
  const notes = typeof rawNotes === "string" && rawNotes.trim() ? rawNotes.trim() : null;

  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) throw new Error("Traveller profile not found.");

  await logEvent("booking_started", { userId: session.userId, role: session.role, metadata: { listingId } });

  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!listing || !listing.active) throw new Error("This listing is not available.");

  let journeyId: string | null = null;
  if (typeof requestedJourneyId === "string" && requestedJourneyId) {
    const [tag] = await db
      .select()
      .from(listingJourneys)
      .where(
        and(
          eq(listingJourneys.listingId, listing.id),
          eq(listingJourneys.journeyId, requestedJourneyId),
        ),
      )
      .limit(1);
    if (tag) journeyId = requestedJourneyId;
  }

  // Only attach a voucher the traveller actually owns, that's for this
  // listing, and hasn't already been used elsewhere — silently ignored
  // otherwise rather than failing the whole booking over it.
  let appliedUserRewardId: string | null = null;
  if (typeof rawUserRewardId === "string" && rawUserRewardId) {
    const [voucher] = await db
      .select({ id: userRewards.id })
      .from(userRewards)
      .where(
        and(
          eq(userRewards.id, rawUserRewardId),
          eq(userRewards.travellerId, travellerProfile.id),
          eq(userRewards.targetType, "listing"),
          eq(userRewards.targetId, listing.id),
          eq(userRewards.status, "claimed"),
        ),
      )
      .limit(1);
    if (voucher) appliedUserRewardId = voucher.id;
  }

  // Bookings start "pending" — the accredited partner has real, finite
  // capacity, so a Passport stamp and a confirmed booking only happen once
  // they actually confirm from their dashboard. See respondToBookingAction.
  const [booking] = await db
    .insert(bookings)
    .values({
      travellerId: travellerProfile.id,
      listingId: listing.id,
      journeyId,
      visitDate,
      visitTime,
      partySize,
      bookingName: bookingName ?? travellerProfile.displayName,
      notes,
      appliedUserRewardId,
      status: "pending",
      bookingRef: generateBookingRef(),
      estimatedCommission: "15.00",
    })
    .returning();

  await logEvent("booking_completed", {
    userId: session.userId,
    role: session.role,
    metadata: { listingId, bookingRef: booking.bookingRef },
  });
  await notifyVendorOfNewBooking(booking.id);

  revalidatePath("/passport");
  revalidatePath("/vendor/dashboard/bookings");
  revalidatePath("/vendor/dashboard/referrals");

  redirect(`/bookings/${booking.bookingRef}`);
}
