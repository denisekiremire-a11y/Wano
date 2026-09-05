"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { bookings, listings, stamps } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { notifyTravellerOfBookingStatus } from "@/lib/booking-notifications";
import { getVendorProfileByUserId } from "@/lib/data/vendor";

export async function respondToBookingAction(
  bookingId: string,
  decision: "confirmed" | "cancelled",
) {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) throw new Error("Vendor profile not found.");

  const [row] = await db
    .select({ booking: bookings, listing: listings })
    .from(bookings)
    .innerJoin(listings, eq(bookings.listingId, listings.id))
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!row || row.listing.vendorProfileId !== vendorProfile.id) {
    throw new Error("You can only respond to bookings on your own listing.");
  }
  if (row.booking.status !== "pending") {
    return;
  }

  await db.update(bookings).set({ status: decision }).where(eq(bookings.id, bookingId));

  if (decision === "confirmed" && row.booking.journeyId) {
    const [existingStamp] = await db
      .select()
      .from(stamps)
      .where(
        and(
          eq(stamps.travellerId, row.booking.travellerId),
          eq(stamps.journeyId, row.booking.journeyId),
        ),
      )
      .limit(1);

    if (!existingStamp) {
      await db.insert(stamps).values({
        travellerId: row.booking.travellerId,
        journeyId: row.booking.journeyId,
        bookingId: row.booking.id,
      });
    }
  }

  await notifyTravellerOfBookingStatus(bookingId, decision);

  revalidatePath("/vendor/dashboard/bookings");
  revalidatePath("/vendor/dashboard/referrals");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/passport");
  revalidatePath("/dashboard/discounts");
  revalidatePath("/dashboard/bookings");
}
