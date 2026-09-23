import { NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { xpBookings } from "@/db/schema";

// Flips "pending" XP bookings older than 2 hours to "cancelled" — a
// traveller who starts Flutterwave checkout and never completes it
// (closes the tab, payment fails silently) otherwise leaves a pending row
// behind forever. This doesn't affect seat capacity (only "confirmed"
// bookings count toward the cap, see createXpBookingAction), so it's
// cleanup rather than anything urgent.
//
// Wired to Vercel Cron via vercel.json, same auth pattern as
// /api/cron/reward-expiry.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const result = await db
    .update(xpBookings)
    .set({ status: "cancelled" })
    .where(and(eq(xpBookings.status, "pending"), lt(xpBookings.createdAt, twoHoursAgo)))
    .returning({ id: xpBookings.id });

  return NextResponse.json({ ok: true, cancelled: result.length });
}
