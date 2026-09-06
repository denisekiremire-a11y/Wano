"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { events, rewards, xpBookings, xpDraws } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { mintUserReward } from "@/lib/actions/reward-actions";
import { getMatchById } from "@/lib/data/xp";
import { getTravellerProfileById, getTravellerProfileByUserId } from "@/lib/data/traveller";
import { notifyAdmin, notifyUser } from "@/lib/notify";
import { MATCH_DAY_CATEGORY, WANO_XP_PRICE_PER_SEAT_UGX, WANO_XP_REFUND_CUTOFF_HOURS, WANO_XP_SEAT_CAP } from "@/lib/xp-config";
import type { ActionState } from "@/lib/validation";

function revalidateXpPaths(matchId: string) {
  revalidatePath(`/events/${matchId}`);
  revalidatePath("/passport");
  revalidatePath("/admin/match-day");
}

const bookingSchema = z.object({
  matchId: z.string().uuid(),
  seats: z.coerce.number().int().min(1).max(WANO_XP_SEAT_CAP),
});

/** Books XP seats for a match. Payment is stubbed for the demo — in
 * production a Flutterwave checkout would sit between the capacity check
 * and this insert, and the booking would start "pending" until its
 * webhook confirms; here it goes straight to "confirmed" (paymentRef
 * stays null). The capacity check itself is real: a Postgres advisory
 * lock scoped to this matchId serializes concurrent bookings for the same
 * match so two travellers can never both take the last seat. */
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

    await tx.insert(xpBookings).values({
      travellerId: travellerProfile.id,
      matchId: parsed.data.matchId,
      seats: parsed.data.seats,
      amountUgx: parsed.data.seats * WANO_XP_PRICE_PER_SEAT_UGX,
      status: "confirmed",
    });

    return {};
  });

  if (result.error) return result;

  const amountUgx = parsed.data.seats * WANO_XP_PRICE_PER_SEAT_UGX;
  await notifyUser(session.email, "Wano XP seats booked", [
    `You booked ${parsed.data.seats} seat(s) for <strong>${match.title}</strong> — UGX ${amountUgx.toLocaleString()}.`,
    "Every confirmed seat is an entry in the match-day prize draw.",
  ]);
  await notifyAdmin("Wano XP booking", [
    `<strong>${travellerProfile.displayName}</strong> booked ${parsed.data.seats} seat(s) for <strong>${match.title}</strong> — UGX ${amountUgx.toLocaleString()}.`,
  ]);

  revalidateXpPaths(parsed.data.matchId);
  return {};
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

  await db.update(xpBookings).set({ status: "refunded" }).where(eq(xpBookings.id, bookingId));

  revalidateXpPaths(booking.matchId);
  return {};
}

const matchSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().min(5).max(1000),
  location: z.string().min(2).max(200),
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
    priceHint: `UGX ${WANO_XP_PRICE_PER_SEAT_UGX.toLocaleString()}/seat`,
  });

  revalidatePath("/admin/match-day");
  revalidatePath("/events");

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
