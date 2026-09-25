import { NextResponse } from "next/server";
import { rejectUnauthorizedCron } from "@/lib/cron-auth";
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
  const rejected = rejectUnauthorizedCron(request);
  if (rejected) return rejected;

  const result = await db
    .update(userRewards)
    .set({ status: "expired" })
    .where(and(eq(userRewards.status, "claimed"), lt(userRewards.expiresAt, new Date())))
    .returning({ id: userRewards.id });

  return NextResponse.json({ ok: true, expired: result.length });
}
