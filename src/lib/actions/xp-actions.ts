"use server";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { events, rewards, travellerProfiles, users, xpBookings, xpDraws } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import {
  createFlutterwavePayment,
  isFlutterwaveConfigured,
  refundFlutterwaveTransaction,
  verifyFlutterwaveTransaction,
} from "@/lib/flutterwave";
import { mintUserReward } from "@/lib/actions/reward-actions";
import { getMatchById } from "@/lib/data/xp";
import { getTravellerProfileById, getTravellerProfileByUserId } from "@/lib/data/traveller";
import { notifyAdmin, notifyUser } from "@/lib/notify";
import { MATCH_DAY_CATEGORY, WANO_XP_PRICE_PER_SEAT_UGX, WANO_XP_REFUND_CUTOFF_HOURS, WANO_XP_SEAT_CAP } from "@/lib/xp-config";
import type { ActionState } from "@/lib/validation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function revalidateXpPaths(matchId: string) {
  revalidatePath(`/events/${matchId}`);
  revalidatePath("/passport");
  revalidatePath("/admin/match-day");
}

const bookingSchema = z.object({
  matchId: z.string().uuid(),
  seats: z.coerce.number().int().min(1).max(WANO_XP_SEAT_CAP),
});

/** Emails the traveller + admin once a booking is actually confirmed —
 * shared by the local-dev instant-confirm path and confirmXpPayment
 * (real payment), so both send the exact same notification. */
async function notifyXpBookingConfirmed(travellerEmail: string, travellerName: string, matchTitle: string, seats: number, amountUgx: number) {
  await notifyUser(travellerEmail, "Wano XP seats booked", [
    `You booked ${seats} seat(s) for <strong>${matchTitle}</strong> — UGX ${amountUgx.toLocaleString()}.`,
    "Every confirmed seat is an entry in the match-day prize draw.",
  ]);
  await notifyAdmin("Wano XP booking", [
    `<strong>${travellerName}</strong> booked ${seats} seat(s) for <strong>${matchTitle}</strong> — UGX ${amountUgx.toLocaleString()}.`,
  ]);
}

/** Books XP seats for a match. The capacity check is a Postgres advisory
 * lock scoped to this matchId, serializing concurrent bookings for the
 * same match so two travellers can never both take the last seat — real,
 * unaffected by any of the payment logic below it.
 *
 * Without FLUTTERWAVE_SECRET_KEY configured (local dev only — see
 * .env.example), this falls back to the old instant-confirm behavior so
 * development/demo isn't blocked on having real payment credentials. The
 * moment a real key is set, anywhere, a booking starts "pending" and only
 * becomes "confirmed" once confirmXpPayment verifies a real payment (via
 * the webhook or the checkout redirect — see the /events/[id] page and
 * /api/webhooks/flutterwave). */
export async function createXpBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Traveller profile not found." };

  const parsed = bookingSchema.safeParse({
    matchId: formData.get("matchId"),
    seats: formData.get("seats"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter how many seats." };

  const match = await getMatchById(parsed.data.matchId);
  if (!match) return { error: "Match not found." };
  if (match.startAt <= new Date()) return { error: "This match has already started." };

  const paymentConfigured = isFlutterwaveConfigured();
  if (!paymentConfigured) {
    console.warn("FLUTTERWAVE_SECRET_KEY is not set — Wano XP booking is using the local-dev instant-confirm fallback, no real payment.");
  }
  const amountUgx = parsed.data.seats * WANO_XP_PRICE_PER_SEAT_UGX;

  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${parsed.data.matchId}))`);

    const takenRows = await tx
      .select({ seats: xpBookings.seats })
      .from(xpBookings)
      .where(and(eq(xpBookings.matchId, parsed.data.matchId), eq(xpBookings.status, "confirmed")));
    const seatsTaken = takenRows.reduce((sum, r) => sum + r.seats, 0);
    const remaining = WANO_XP_SEAT_CAP - seatsTaken;

    if (parsed.data.seats > remaining) {
      return { error: remaining <= 0 ? "This match is sold out." : `Only ${remaining} seat(s) left.` };
    }

    const [booking] = await tx
      .insert(xpBookings)
      .values({
        travellerId: travellerProfile.id,
        matchId: parsed.data.matchId,
        seats: parsed.data.seats,
        amountUgx,
        status: paymentConfigured ? "pending" : "confirmed",
      })
      .returning();

    return { booking };
  });

  if (result.error || !result.booking) return { error: result.error };
  const { booking } = result;

  if (!paymentConfigured) {
    await notifyXpBookingConfirmed(session.email, travellerProfile.displayName, match.title, parsed.data.seats, amountUgx);
    revalidateXpPaths(parsed.data.matchId);
    return {};
  }

  let checkoutLink: string;
  try {
    checkoutLink = await createFlutterwavePayment({
      txRef: booking.id,
      amountUgx,
      customerEmail: session.email,
      customerName: travellerProfile.displayName,
      title: `${parsed.data.seats} seat(s) — ${match.title}`,
      redirectUrl: `${APP_URL}/events/${parsed.data.matchId}?xpTxRef=${booking.id}`,
    });
  } catch (err) {
    console.error("Failed to create Flutterwave payment for XP booking", booking.id, err);
    await db.delete(xpBookings).where(eq(xpBookings.id, booking.id));
    return { error: "Couldn't start payment — try again." };
  }

  redirect(checkoutLink);
}

/** Verifies a Flutterwave transaction and, if it genuinely paid for this
 * booking, confirms it — called from both the webhook (async, works even
 * if the traveller closes their browser) and the checkout redirect page
 * (immediate, for the common case). Idempotent: the status transition only
 * happens via an UPDATE ... WHERE status = 'pending', so whichever caller
 * gets there first wins and the other is a safe no-op — no duplicate
 * confirmation, no duplicate email. */
export async function confirmXpPayment(bookingId: string, transactionId: string): Promise<void> {
  const [booking] = await db.select().from(xpBookings).where(eq(xpBookings.id, bookingId)).limit(1);
  if (!booking || booking.status !== "pending") return;

  let verified;
  try {
    verified = await verifyFlutterwaveTransaction(transactionId);
  } catch (err) {
    console.error("Failed to verify Flutterwave transaction", transactionId, "for XP booking", bookingId, err);
    return;
  }

  if (
    verified.txRef !== bookingId ||
    verified.currency !== "UGX" ||
    verified.amount < booking.amountUgx ||
    verified.status !== "successful"
  ) {
    console.error("Flutterwave verification mismatch for XP booking", bookingId, verified);
    return;
  }

  const [updated] = await db
    .update(xpBookings)
    .set({ status: "confirmed", paymentRef: verified.id })
    .where(and(eq(xpBookings.id, bookingId), eq(xpBookings.status, "pending")))
    .returning();
  if (!updated) return;

  const match = await getMatchById(booking.matchId);
  const [travellerRow] = await db
    .select({ displayName: travellerProfiles.displayName, email: users.email })
    .from(travellerProfiles)
    .innerJoin(users, eq(users.id, travellerProfiles.userId))
    .where(eq(travellerProfiles.id, booking.travellerId))
    .limit(1);
  if (match && travellerRow) {
    await notifyXpBookingConfirmed(travellerRow.email, travellerRow.displayName, match.title, booking.seats, booking.amountUgx);
  }

  revalidateXpPaths(booking.matchId);
}

export async function cancelXpBookingAction(bookingId: string): Promise<ActionState> {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return { error: "Traveller profile not found." };

  const [booking] = await db.select().from(xpBookings).where(eq(xpBookings.id, bookingId)).limit(1);
  if (!booking || booking.travellerId !== travellerProfile.id) return { error: "Booking not found." };
  if (booking.status !== "confirmed") return { error: "This booking can't be cancelled." };

  const match = await getMatchById(booking.matchId);
  if (!match) return { error: "Match not found." };

  const hoursUntilKickoff = (match.startAt.getTime() - Date.now()) / (60 * 60 * 1000);
  if (hoursUntilKickoff < WANO_XP_REFUND_CUTOFF_HOURS) {
    return { error: `Too close to kick-off to cancel — refunds close ${WANO_XP_REFUND_CUTOFF_HOURS}h before.` };
  }

  // paymentRef is only set once a real Flutterwave payment was confirmed
  // (see confirmXpPayment) — a local-dev-fallback booking never had real
  // money move, so there's nothing to refund, same as before.
  if (booking.paymentRef) {
    const refunded = await refundFlutterwaveTransaction(booking.paymentRef, booking.amountUgx);
    if (!refunded) {
      return { error: "Couldn't process the refund — try again or contact support." };
    }
  }

  await db.update(xpBookings).set({ status: "refunded" }).where(eq(xpBookings.id, bookingId));

  revalidateXpPaths(booking.matchId);
  return {};
}

const matchSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().min(5).max(1000),
  location: z.string().min(2).max(200),
  venueId: z.enum(["namboole", "hoima"]).optional().or(z.literal("")),
  startAt: z.string().min(1),
  durationHours: z.coerce.number().min(1).max(6).default(2),
});

/** A minimal, XP-specific event-creation path (rather than reusing the
 * general createEventAction) so a match always gets an endAt — reward
 * vouchers tied to a match expire at that endAt, not a generic default. */
export async function createMatchAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("admin");

  const parsed = matchSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    location: formData.get("location"),
    venueId: formData.get("venueId") ?? "",
    startAt: formData.get("startAt"),
    durationHours: formData.get("durationHours") || "2",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the match fields." };

  const startAt = new Date(parsed.data.startAt);
  if (Number.isNaN(startAt.getTime()) || startAt <= new Date()) {
    return { error: "Pick a kick-off date and time in the future." };
  }
  const endAt = new Date(startAt.getTime() + parsed.data.durationHours * 60 * 60 * 1000);

  await db.insert(events).values({
    title: parsed.data.title,
    description: parsed.data.description,
    category: MATCH_DAY_CATEGORY,
    startAt,
    endAt,
    location: parsed.data.location,
    venueId: parsed.data.venueId || null,
    priceHint: `UGX ${WANO_XP_PRICE_PER_SEAT_UGX.toLocaleString()}/seat`,
  });

  revalidatePath("/admin/match-day");
  revalidatePath("/events");
  revalidatePath("/afcon");
  if (parsed.data.venueId) revalidatePath(`/afcon/${parsed.data.venueId}`);

  return {};
}

/** Picks a random confirmed booking as the winner — one entry per
 * booking, not per seat, matching "every confirmed booking is an entry".
 * prizeRewardId must be an active source="xp_draw" reward already in the
 * catalog; its target is what actually gets minted for the winner. */
export async function runXpDrawAction(
  matchId: string,
  prizeRewardId: string,
): Promise<ActionState & { winnerName?: string }> {
  await requireRole("admin");

  const [existingDraw] = await db.select().from(xpDraws).where(eq(xpDraws.matchId, matchId)).limit(1);
  if (existingDraw?.drawnAt) return { error: "This match has already been drawn." };

  const confirmed = await db
    .select()
    .from(xpBookings)
    .where(and(eq(xpBookings.matchId, matchId), eq(xpBookings.status, "confirmed")));
  if (confirmed.length === 0) return { error: "No confirmed bookings to draw from yet." };

  const winner = confirmed[Math.floor(Math.random() * confirmed.length)];
  const winnerProfile = await getTravellerProfileById(winner.travellerId);

  const [reward] = await db
    .select()
    .from(rewards)
    .where(and(eq(rewards.id, prizeRewardId), eq(rewards.source, "xp_draw"), eq(rewards.active, true)))
    .limit(1);
  if (!reward) return { error: "Pick a prize from the XP draw pool." };

  await mintUserReward(winner.travellerId, prizeRewardId);

  if (existingDraw) {
    await db
      .update(xpDraws)
      .set({ prizeTitle: reward.title, drawnAt: new Date(), winnerTravellerId: winner.travellerId })
      .where(eq(xpDraws.id, existingDraw.id));
  } else {
    await db.insert(xpDraws).values({
      matchId,
      prizeTitle: reward.title,
      drawnAt: new Date(),
      winnerTravellerId: winner.travellerId,
    });
  }

  revalidateXpPaths(matchId);

  return { winnerName: winnerProfile?.displayName ?? "Traveller" };
}
