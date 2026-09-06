import { NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { userRewards } from "@/db/schema";

// Flips "claimed" vouchers past their expiresAt to "expired". Redemption
// also re-checks expiresAt itself (see markRewardRedeemedAction) so a
// voucher can never be redeemed late just because this hasn't run yet —
// this is what makes expiry a real state transition rather than something
// only enforced at read time.
//
// Wired to Vercel Cron via vercel.json, same auth pattern as
// /api/cron/feed.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await db
    .update(userRewards)
    .set({ status: "expired" })
    .where(and(eq(userRewards.status, "claimed"), lt(userRewards.expiresAt, new Date())))
    .returning({ id: userRewards.id });

  return NextResponse.json({ ok: true, expired: result.length });
}
