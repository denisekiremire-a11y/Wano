import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { notifyTravellerOfRequestExpired } from "@/lib/booking-notifications";
import { SIMILAR_LISTINGS_LIMIT } from "@/lib/booking-config";
import { searchListings } from "@/lib/data/journeys";
import { expirePendingRequests, expireStaleHolds } from "@/lib/slot-booking";

// Backstop cleanup, not the correctness mechanism — reserveSlotHold and
// confirmBookingPayment both already recompute a slot's real capacity live
// from held+confirmed rows, so a hold past its 10-minute window can never
// block a new booking even if this hasn't run yet. What this actually
// does: flips stale "held"/"pending" rows to "expired" so they stop
// showing as live in dashboards/history, and sends the request-expiry
// email with alternatives. Wired to Vercel Cron via vercel.json, same
// auth pattern as the other /api/cron/* routes.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { expiredBookingIds } = await expireStaleHolds();
  const expiredRequests = await expirePendingRequests();

  for (const req of expiredRequests) {
    if (!req.listingId) continue;
    const [listing] = await db.select({ type: listings.type }).from(listings).where(eq(listings.id, req.listingId)).limit(1);
    if (!listing) continue;
    const similar = await searchListings({ type: listing.type });
    const alternatives = similar
      .filter((row) => row.listing.id !== req.listingId)
      .slice(0, SIMILAR_LISTINGS_LIMIT)
      .map((row) => ({ id: row.listing.id, title: row.listing.title }));
    await notifyTravellerOfRequestExpired(req.bookingId, alternatives);
  }

  return NextResponse.json({
    ok: true,
    expiredHolds: expiredBookingIds.length,
    expiredRequests: expiredRequests.length,
  });
}
