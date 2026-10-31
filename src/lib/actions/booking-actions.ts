"use server";

import { and, eq, notInArray, sql, sum } from "drizzle-orm";
import { redirect } from "next/navigation";
import { attachPlanGuests } from "@/lib/data/plans";
import { takeGroupPlanId } from "@/lib/group-plan-cookie";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { bookingItems, bookings, events, listingItems, listingJourneys, listings, restaurantDetails, rewards, userRewards, vendorProfiles } from "@/db/schema";
import { requireRole, requireVerifiedTraveller } from "@/lib/auth";
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
  computeEstimatedCommission,
  decodeBookingDraft,
  encodeBookingDraft,
  generateBookingRef,
  parseBookingDraft,
  parseEventBookingDraft,
} from "@/lib/booking-shared";
import { withRlsContext } from "@/lib/db-context";
import { PAID_BOOKINGS_ENABLED } from "@/lib/feature-flags";
import { createFlutterwavePayment, isFlutterwaveConfigured, missingFlutterwaveEnv } from "@/lib/flutterwave";
import type { ListingType } from "@/lib/listing-type";
import { cancelBooking, confirmHeldBookingWithoutPayment, releaseHeldBooking, reserveSlotHold } from "@/lib/slot-booking";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { generateGoingItem } from "@/lib/feed-generators";
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
  const row = await withRlsContext({ role: "traveller", travellerProfileId: travellerId }, (tx) =>
    tx
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
      .limit(1)
      .then((rows) => rows[0]),
  );
  return row ?? null;
}

/** Step 1 of booking: validates the type-specific form (item selection
 * required for some types, a date for most), then redirects to a review
 * screen with the draft encoded in the URL — nothing is written to the
 * database yet, so an abandoned draft never shows up as a fake pending
 * booking anywhere bookings are queried. Returns ActionState (rather than
 * throwing) so a validation failure shows as an inline message instead of
 * crashing the whole page — see requireVerifiedTraveller's doc comment. */
export async function previewBookingAction(_prev: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const listingId = formData.get("listingId");
  if (typeof listingId !== "string" || !listingId) return { error: "Missing listing." };

  const verified = await requireVerifiedTraveller();
  if ("error" in verified) return { error: verified.error };

  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!listing || !listing.active) return { error: "This listing is not available." };
  const type = listing.type as ListingType;

  const [items, [restaurantRow]] = await Promise.all([
    db.select().from(listingItems).where(eq(listingItems.listingId, listingId)),
    type === "restaurant"
      ? db.select().from(restaurantDetails).where(eq(restaurantDetails.listingId, listingId)).limit(1)
      : Promise.resolve([undefined]),
  ]);

  const parsed = parseBookingDraft(formData, type, items, restaurantRow?.allowsPreorder ?? false);
  if ("error" in parsed) return { error: parsed.error };
  if (listing.bookingMode === "instant" && !parsed.data.slotId) {
    return { error: "Pick a time slot before continuing." };
  }

  redirect(`/explore/${listingId}?${encodeBookingDraft(parsed.data).toString()}`);
}

/** Step 2: the review screen's CONFIRM button re-posts the same fields
 * (as hidden inputs) here, where the booking is actually created. */
/** If the booker came from "Book for the group" on one of their plans,
 * bring that plan's "going" friends onto this booking (see plans.ts). */
async function attachGroupIfAny(booking: {
  id: string;
  travellerId: string;
  listingId: string | null;
  eventId: string | null;
  partySize: number | null;
}) {
  const planId = await takeGroupPlanId();
  if (planId) await attachPlanGuests(planId, booking);
}

export async function bookListingFormAction(_prev: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const listingId = formData.get("listingId");
  if (typeof listingId !== "string" || !listingId) return { error: "Missing listing." };

  const verified = await requireVerifiedTraveller();
  if ("error" in verified) return { error: verified.error };
  const session = verified.session;
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Traveller profile not found." };

  await logEvent("booking_started", { userId: session.userId, role: session.role, metadata: { listingId } });

  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!listing || !listing.active) return { error: "This listing is not available." };
  // Restaurants/bars/eateries stay information-only — never bookable, no
  // matter what a client sends. The UI never renders a booking form for
  // one (see BookingForm's dispatch and explore/[id]/page.tsx), so this
  // is the server-side backstop, not the primary gate.
  if (listing.type === "restaurant") return { error: "This listing is for browsing only — it can't be booked." };

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
    if (!draft.slotId) return { error: "Pick a time slot before continuing." };

    const missingPaymentEnv = missingFlutterwaveEnv();
    if (subtotalMinor > 0 && missingPaymentEnv.length > 0 && process.env.NODE_ENV !== "development") {
      console.error(`Refusing paid instant booking for listing ${listing.id} — missing ${missingPaymentEnv.join(", ")}.`);
      return { error: "Paid bookings aren't available right now — please try again later." };
    }

    const [vendor] = await db
      .select({ paidBookingsPilot: vendorProfiles.paidBookingsPilot })
      .from(vendorProfiles)
      .where(eq(vendorProfiles.id, listing.vendorProfileId))
      .limit(1);
    const paidPilotActive =
      PAID_BOOKINGS_ENABLED && !!vendor?.paidBookingsPilot && isFlutterwaveConfigured() && !!totalMinor;

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
      estimatedCommission: computeEstimatedCommission(listing.type, totalMinor, paidPilotActive),
      lineItems: lineItems.filter((li) => li.item).map((li) => ({
        itemId: li.item!.id,
        name: li.item!.name,
        priceMinor: li.item!.priceMinor,
        quantity: li.quantity,
      })),
    });
    if ("error" in result) return { error: result.error };
    const { booking } = result;
    await attachGroupIfAny(booking);

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
      return { error: "Couldn't start payment — try again." };
    }
    redirect(checkoutLink);
  }

  // Request mode — unchanged behavior: the vendor confirms from their
  // dashboard (see respondToBookingAction), auto-expires after
  // REQUEST_EXPIRY_HOURS if they never respond (see expirePendingRequests).
  const booking = await withRlsContext(
    { userId: session.userId, role: "traveller", travellerProfileId: travellerProfile.id },
    async (tx) => {
      const [booking] = await tx
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
          // Request mode is always pay-at-venue — nothing is paid here, so
          // no commission, regardless of the Part B pilot flag.
          estimatedCommission: "0",
          subtotalMinor: subtotalMinor || null,
          totalMinor: subtotalMinor ? totalMinor : null,
        })
        .returning();

      if (lineItems.length > 0) {
        await tx.insert(bookingItems).values(
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
      return booking;
    },
  );

  await attachGroupIfAny(booking);
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
export async function previewEventTicketAction(_prev: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const eventId = formData.get("eventId");
  if (typeof eventId !== "string" || !eventId) return { error: "Missing event." };

  const verified = await requireVerifiedTraveller();
  if ("error" in verified) return { error: verified.error };

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event || !event.active) return { error: "This event is not available." };

  const items = await db.select().from(listingItems).where(eq(listingItems.eventId, eventId));
  const parsed = parseEventBookingDraft(formData, items);
  if ("error" in parsed) return { error: parsed.error };

  redirect(`/events/${eventId}?${encodeBookingDraft(parsed.data).toString()}`);
}

export async function buyEventTicketsAction(_prev: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const eventId = formData.get("eventId");
  if (typeof eventId !== "string" || !eventId) return { error: "Missing event." };

  const verified = await requireVerifiedTraveller();
  if ("error" in verified) return { error: verified.error };
  const session = verified.session;
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Traveller profile not found." };

  await logEvent("booking_started", { userId: session.userId, role: session.role, metadata: { eventId } });

  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event || !event.active) return { error: "This event is not available." };

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

  const requestedPartySize = draft.partySize ?? 1;

  const result = await withRlsContext(
    { userId: session.userId, role: "traveller", travellerProfileId: travellerProfile.id },
    async (tx) => {
      // Serialize ticket sales for this event the same way reserveSlotHold
      // serializes a slot — without this lock, two concurrent purchases
      // can both pass the capacity check below and oversell the event.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${eventId}))`);

      if (event.capacity != null) {
        const [{ total }] = await tx
          .select({ total: sum(bookings.partySize) })
          .from(bookings)
          .where(and(eq(bookings.eventId, eventId), notInArray(bookings.status, ["cancelled", "expired"])));
        // sum() over partySize rows that are each NULL falls back to the
        // same "1 person" default the insert itself uses below, so a mix
        // of ticket purchases with and without an explicit party size
        // still counts accurately against capacity.
        const ticketsSold = Number(total ?? 0);
        const remaining = event.capacity - ticketsSold;
        if (requestedPartySize > remaining) {
          return { error: remaining <= 0 ? "This event is sold out." : `Only ${remaining} ticket(s) left.` } as const;
        }
      }

      const [booking] = await tx
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
          // Event tickets are always pay-at-venue too — no instant/paid
          // path exists for events, so this is always 0.
          estimatedCommission: "0",
          subtotalMinor: subtotalMinor || null,
          totalMinor: subtotalMinor ? totalMinor : null,
        })
        .returning();

      if (lineItems.length > 0) {
        await tx.insert(bookingItems).values(
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
      return booking;
    },
  );

  if ("error" in result) return result;
  const booking = result;

  await attachGroupIfAny(booking);
  await logEvent("booking_completed", {
    userId: session.userId,
    role: session.role,
    metadata: { eventId, bookingRef: booking.bookingRef },
  });
  await notifyVendorOfNewBooking(booking.id);
  await notifyTravellerOfNewBooking(booking.id);
  await generateGoingItem(eventId, travellerProfile.id);

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
