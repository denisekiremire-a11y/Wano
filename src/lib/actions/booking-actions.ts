"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { bookings, journeys, listingJourneys, listings } from "@/db/schema";
import { requireRole } from "@/lib/auth";
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
  const rawPartySize = formData.get("partySize");
  const visitDate =
    typeof rawVisitDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawVisitDate) ? rawVisitDate : null;
  const partySize =
    typeof rawPartySize === "string" && rawPartySize.trim() ? Number(rawPartySize) : null;

  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) throw new Error("Traveller profile not found.");

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

  const journey = journeyId
    ? (await db.select().from(journeys).where(eq(journeys.id, journeyId)).limit(1))[0]
    : null;

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
      partySize,
      status: "pending",
      bookingRef: generateBookingRef(),
      estimatedCommission: "15.00",
    })
    .returning();

  revalidatePath("/home");
  revalidatePath("/bookings");
  revalidatePath("/vendor/dashboard/bookings");
  revalidatePath("/vendor/dashboard/referrals");

  const params = new URLSearchParams({
    booked: booking.bookingRef,
    journey: journey?.name ?? "",
  });
  redirect(`/profile?${params.toString()}`);
}
