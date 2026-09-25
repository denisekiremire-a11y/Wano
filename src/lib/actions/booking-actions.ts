"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { bookingItems, bookings, events, listingItems, listingJourneys, listings, restaurantDetails, rewards, userRewards } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { logEvent } from "@/lib/analytics";
import {
  notifyTravellerOfBookingStatus,
  notifyTravellerOfNewBooking,
  notifyVendorOfInstantBooking,
  notifyVendorOfNewBooking,
  notifyVendorOfTravellerCancellation,
} from "@/lib/booking-notifications";
import { REQUEST_EXPIRY_HOURS } from "@/lib/booking-config";
import {
  computeBookingTotals,
  decodeBookingDraft,
  encodeBookingDraft,
  generateBookingRef,
  parseBookingDraft,
  parseEventBookingDraft,
} from "@/lib/booking-shared";
import { createFlutterwavePayment, isFlutterwaveConfigured } from "@/lib/flutterwave";
import type { ListingType } from "@/lib/listing-type";
import { cancelBooking, confirmHeldBookingWithoutPayment, releaseHeldBooking, reserveSlotHold } from "@/lib/slot-booking";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import type { ActionState } from "@/lib/validation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function revalidateBookingPaths() {
  revalidatePath("/passport");
  revalidatePath("/vendor/dashboard/bookings");
  revalidatePath("/vendor/dashboard/referrals");
}

function formDataToRecord(formData: FormData): Record<string, string | undefined> {
  const record: Record<string, string | undefined> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") record[key] = value;
  }
  return record;
}

async function resolveJourneyId(listingId: string, requestedJourneyId: string | null) {
  if (!requestedJourneyId) return null;
  const [tag] = await db
    .select()
    .from(listingJourneys)
    .where(and(eq(listingJourneys.listingId, listingId), eq(listingJourneys.journeyId, requestedJourneyId)))
    .limit(1);
  return tag ? requestedJourneyId : null;
}

async function resolveReward(
  travellerId: string,
  targetType: "listing" | "event",
  targetId: string,
  userRewardId: string | null,
) {
  if (!userRewardId) return null;
  const [row] = await db
    .select({ userReward: userRewards, reward: rewards })
    .from(userRewards)
    .innerJoin(rewards, eq(rewards.id, userRewards.rewardId))
    .where(
      and(
        eq(userRewards.id, userRewardId),
        eq(userRewards.travellerId, travellerId),
        eq(userRewards.targetType, targetType),
        eq(userRewards.targetId, targetId),
        eq(userRewards.status, "claimed"),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Step 1 of booking: validates the type-specific form (item selection
 * required for some types, a date for most), then redirects to a review
 * screen with the draft encoded in the URL — nothing is written to the
 * database yet, so an abandoned draft never shows up as a fake pending
 * booking anywhere bookings are queried. */
export async function previewBookingAction(formData: FormData) {
  const listingId = formData.get("listingId");
  if (typeof listingId !== "string" || !listingId) throw new Error("Missing listing.");

  await requireRole("traveller");

  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!listing || !listing.active) throw new Error("This listing is not available.");
  const type = listing.type as ListingType;

  const [items, [restaurantRow]] = await Promise.all([
    db.select().from(listingItems).where(eq(listingItems.listingId, listingId)),
    type === "restaurant"
      ? db.select().from(restaurantDetails).where(eq(restaurantDetails.listingId, listingId)).limit(1)
      : Promise.resolve([undefined]),
  ]);

  const parsed = parseBookingDraft(formData, type, items, restaurantRow?.allowsPreorder ?? false);
  if ("error" in parsed) throw new Error(parsed.error);
  if (listing.bookingMode === "instant" && !parsed.data.slotId) {
    throw new Error("Pick a time slot before continuing.");
  }

  redirect(`/explore/${listingId}?${encodeBookingDraft(parsed.data).toString()}`);
}

/** Step 2: the review screen's CONFIRM button re-posts the same fields
 * (as hidden inputs) here, where the booking is actually created. */
export async function bookListingFormAction(formData: FormData) {
  const listingId = formData.get("listingId");
  if (typeof listingId !== "string" || !listingId) throw new Error("Missing listing.");

  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) throw new Error("Traveller profile not found.");

  await logEvent("booking_started", { userId: session.userId, role: session.role, metadata: { listingId } });

  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!listing || !listing.active) throw new Error("This listing is not available.");

  const draft = decodeBookingDraft(formDataToRecord(formData));
  const [journeyId, rewardRow, listingItemRows] = await Promise.all([
    resolveJourneyId(listing.id, draft.journeyId),
    resolveReward(travellerProfile.id, "listing", listing.id, draft.userRewardId),
    db.select().from(listingItems).where(eq(listingItems.listingId, listing.id)),
  ]);

  const { subtotalMinor, totalMinor, lineItems } = computeBookingTotals(
    draft,
    listingItemRows,
    listing.priceMinor,
    rewardRow ? { discountType: rewardRow.reward.discountType, discountValue: rewardRow.reward.discountValue } : null,
  );

  if (listing.bookingMode === "instant") {
    if (!draft.slotId) throw new Error("Pick a time slot before continuing.");

    const result = await reserveSlotHold({
      travellerId: travellerProfile.id,
      listingId: listing.id,
      slotId: draft.slotId,
      partySize: draft.partySize ?? 1,
      bookingName: draft.bookingName ?? travellerProfile.displayName,
      notes: draft.notes,
      journeyId,
      appliedUserRewardId: rewardRow?.userReward.id ?? null,
      subtotalMinor: subtotalMinor || null,
      totalMinor: subtotalMinor ? totalMinor : null,
      lineItems: lineItems.filter((li) => li.item).map((li) => ({
        itemId: li.item!.id,
        name: li.item!.name,
        priceMinor: li.item!.priceMinor,
        quantity: li.quantity,
      })),
    });
    if ("error" in result) throw new Error(result.error);
    const { booking } = result;

    const paymentConfigured = isFlutterwaveConfigured() && !!booking.totalMinor;
    if (!paymentConfigured) {
      console.warn(
        !isFlutterwaveConfigured()
          ? "FLUTTERWAVE_SECRET_KEY is not set — instant booking is using the local-dev instant-confirm fallback, no real payment."
          : "This booking has no price set — confirming instantly with no payment.",
      );
      await confirmHeldBookingWithoutPayment(booking.id);
      await logEvent("booking_completed", {
        userId: session.userId,
        role: session.role,
        metadata: { listingId, bookingRef: booking.bookingRef },
      });
      await notifyVendorOfInstantBooking(booking.id);
      await notifyTravellerOfBookingStatus(booking.id, "confirmed");
      revalidateBookingPaths();
      redirect(`/bookings/${booking.bookingRef}`);
    }

    let checkoutLink: string;
    try {
      checkoutLink = await createFlutterwavePayment({
        txRef: booking.id,
        amountUgx: booking.totalMinor!,
        customerEmail: session.email,
        customerName: travellerProfile.displayName,
        title: listing.title,
        customizationTitle: "Wano",
        redirectUrl: `${APP_URL}/bookings/${booking.bookingRef}?bookingTxRef=${booking.id}`,
      });
    } catch (err) {
      console.error("Failed to create Flutterwave payment for booking", booking.id, err);
      await releaseHeldBooking(booking.id);
      throw new Error("Couldn't start payment — try again.");
    }
    redirect(checkoutLink);
  }

  // Request mode — unchanged behavior: the vendor confirms from their
  // dashboard (see respondToBookingAction), auto-expires after
  // REQUEST_EXPIRY_HOURS if they never respond (see expirePendingRequests).
  const [booking] = await db
    .insert(bookings)
    .values({
      travellerId: travellerProfile.id,
      listingId: listing.id,
      journeyId,
      visitDate: draft.visitDate,
      visitTime: draft.visitTime,
      endDate: draft.endDate,
      partySize: draft.partySize,
      childrenCount: draft.childrenCount,
      pickupLocation: draft.pickupLocation,
      dropoffLocation: draft.dropoffLocation,
      bookingName: draft.bookingName ?? travellerProfile.displayName,
      notes: draft.notes,
      details: Object.keys(draft.details).length > 0 ? draft.details : null,
      appliedUserRewardId: rewardRow?.userReward.id ?? null,
      status: "pending",
      requestExpiresAt: new Date(Date.now() + REQUEST_EXPIRY_HOURS * 60 * 60 * 1000),
      bookingRef: generateBookingRef(),
      estimatedCommission: "15.00",
      subtotalMinor: subtotalMinor || null,
      totalMinor: subtotalMinor ? totalMinor : null,
    })
    .returning();

  if (lineItems.length > 0) {
    await db.insert(bookingItems).values(
      lineItems
        .filter((li) => li.item)
        .map((li) => ({
          bookingId: booking.id,
          listingItemId: li.item!.id,
          nameAtBooking: li.item!.name,
          priceMinorAtBooking: li.item!.priceMinor,
          quantity: li.quantity,
        })),
    );
  }

  await logEvent("booking_completed", {
    userId: session.userId,
    role: session.role,
    metadata: { listingId, bookingRef: booking.bookingRef },
  });
  await notifyVendorOfNewBooking(booking.id);
  await notifyTravellerOfNewBooking(booking.id);

  revalidateBookingPaths();
  redirect(`/bookings/${booking.bookingRef}`);
}

/** The event-booking counterpart to previewBookingAction/bookListingFormAction
 * — same draft encode/decode, same review-before-confirm shape, just keyed
 * by eventId instead of listingId. Uses parseEventBookingDraft rather than
 * parseBookingDraft: every event is bookable (party size + name + notes),
 * with a ticket-tier selection as an optional add-on when the organizer has
 * configured one — looser than the "event" listing type, which requires a
 * tier. computeBookingTotals is still reused as-is. */
export async function previewEventTicketAction(formData: FormData) {
  const eventId = formData.get("eventId");
  if (typeof eventId !== "string" || !eventId) throw new Error("Missing event.");

  await requireRole("traveller");

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event || !event.active) throw new Error("This event is not available.");

  const items = await db.select().from(listingItems).where(eq(listingItems.eventId, eventId));
  const parsed = parseEventBookingDraft(formData, items);
  if ("error" in parsed) throw new Error(parsed.error);

  redirect(`/events/${eventId}?${encodeBookingDraft(parsed.data).toString()}`);
}

export async function buyEventTicketsAction(formData: FormData) {
  const eventId = formData.get("eventId");
  if (typeof eventId !== "string" || !eventId) throw new Error("Missing event.");

  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) throw new Error("Traveller profile not found.");

  await logEvent("booking_started", { userId: session.userId, role: session.role, metadata: { eventId } });

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event || !event.active) throw new Error("This event is not available.");

  const draft = decodeBookingDraft(formDataToRecord(formData));
  const [rewardRow, eventItemRows] = await Promise.all([
    resolveReward(travellerProfile.id, "event", eventId, draft.userRewardId),
    db.select().from(listingItems).where(eq(listingItems.eventId, eventId)),
  ]);

  const { subtotalMinor, totalMinor, lineItems } = computeBookingTotals(
    draft,
    eventItemRows,
    null,
    rewardRow ? { discountType: rewardRow.reward.discountType, discountValue: rewardRow.reward.discountValue } : null,
  );

  const [booking] = await db
    .insert(bookings)
    .values({
      travellerId: travellerProfile.id,
      eventId: event.id,
      bookingName: draft.bookingName ?? travellerProfile.displayName,
      partySize: draft.partySize,
      childrenCount: draft.childrenCount,
      notes: draft.notes,
      appliedUserRewardId: rewardRow?.userReward.id ?? null,
      status: "pending",
      bookingRef: generateBookingRef(),
      estimatedCommission: "15.00",
      subtotalMinor: subtotalMinor || null,
      totalMinor: subtotalMinor ? totalMinor : null,
    })
    .returning();

  if (lineItems.length > 0) {
    await db.insert(bookingItems).values(
      lineItems
        .filter((li) => li.item)
        .map((li) => ({
          bookingId: booking.id,
          listingItemId: li.item!.id,
          nameAtBooking: li.item!.name,
          priceMinorAtBooking: li.item!.priceMinor,
          quantity: li.quantity,
        })),
    );
  }

  await logEvent("booking_completed", {
    userId: session.userId,
    role: session.role,
    metadata: { eventId, bookingRef: booking.bookingRef },
  });
  await notifyVendorOfNewBooking(booking.id);
  await notifyTravellerOfNewBooking(booking.id);

  revalidatePath("/passport");
  revalidatePath("/vendor/dashboard/bookings");

  redirect(`/bookings/${booking.bookingRef}`);
}

/** Traveller-initiated cancellation — the actual policy (free up to
 * CANCELLATION_CUTOFF_HOURS before the slot, non-refundable after) lives
 * in cancelBooking itself; this is just the auth/ownership check plus the
 * Next-specific side effects (notify, revalidate) around it. Called
 * directly via useTransition, not a <form action>, same reasoning as
 * cancelXpBookingAction — the result needs to update the page in place. */
export async function cancelBookingAction(bookingId: string): Promise<ActionState> {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Traveller profile not found." };

  const result = await cancelBooking(bookingId, travellerProfile.id);
  if ("error" in result) return { error: result.error };

  await notifyVendorOfTravellerCancellation(bookingId);

  revalidatePath("/passport");
  revalidatePath(`/bookings`);
  revalidatePath("/vendor/dashboard/bookings");

  return {};
}
