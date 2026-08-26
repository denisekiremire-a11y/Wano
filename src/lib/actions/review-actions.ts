"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { bookings, reviews } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import type { ActionState } from "@/lib/validation";

const reviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).optional().or(z.literal("")),
});

export async function submitReviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Traveller profile not found." };

  const parsed = reviewSchema.safeParse({
    bookingId: formData.get("bookingId"),
    rating: formData.get("rating"),
    comment: formData.get("comment") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your review." };
  }

  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, parsed.data.bookingId))
    .limit(1);

  if (!booking || booking.travellerId !== travellerProfile.id) {
    return { error: "You can only review your own bookings." };
  }
  if (booking.status !== "completed") {
    return { error: "You can only review a booking once it's marked completed." };
  }

  const [existing] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.bookingId, booking.id))
    .limit(1);
  if (existing) return { error: "You've already reviewed this booking." };

  await db.insert(reviews).values({
    listingId: booking.listingId,
    travellerId: travellerProfile.id,
    bookingId: booking.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment || null,
  });

  revalidatePath("/bookings");
  revalidatePath("/profile");
  revalidatePath("/explore");
  revalidatePath("/home");

  return {};
}
