"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { bookings, reviews } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/analytics";
import { generateReviewPostedItem } from "@/lib/feed-generators";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import type { ActionState } from "@/lib/validation";

const ratingField = z.coerce.number().int().min(1).max(5);

const reviewSchema = z.object({
  bookingId: z.string().uuid(),
  safetyRating: ratingField,
  reliabilityRating: ratingField,
  valueRating: ratingField,
  communicationRating: ratingField,
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
    safetyRating: formData.get("safetyRating"),
    reliabilityRating: formData.get("reliabilityRating"),
    valueRating: formData.get("valueRating"),
    communicationRating: formData.get("communicationRating"),
    comment: formData.get("comment") ?? "",
  });
  if (!parsed.success) {
    return { error: "Please rate all four categories before submitting." };
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

  const { safetyRating, reliabilityRating, valueRating, communicationRating } = parsed.data;
  // Overall is the average of the four categories, rounded — one headline
  // number for cards/badges, without asking the traveller to rate twice.
  const rating = Math.round((safetyRating + reliabilityRating + valueRating + communicationRating) / 4);

  const [review] = await db
    .insert(reviews)
    .values({
      listingId: booking.listingId,
      travellerId: travellerProfile.id,
      bookingId: booking.id,
      rating,
      safetyRating,
      reliabilityRating,
      valueRating,
      communicationRating,
      comment: parsed.data.comment || null,
    })
    .returning();

  await generateReviewPostedItem(review.id);

  await logEvent("review_submitted", {
    userId: session.userId,
    role: session.role,
    metadata: { listingId: booking.listingId, rating },
  });

  revalidatePath("/passport");
  revalidatePath("/explore");
  revalidatePath(`/explore/${booking.listingId}`);

  return {};
}
