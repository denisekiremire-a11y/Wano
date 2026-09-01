import { NextResponse } from "next/server";
import { runFeedTimeBasedGenerators } from "@/lib/feed-generators";

// Generates the feed_items that aren't triggered by a user action —
// event_upcoming, event_momentum, perk_expiring — for anything that just
// crossed its time threshold. Every insert is dedupe-key idempotent, so
// re-running this (a retry, an overlapping invocation) is always safe.
//
// Wired to Vercel Cron via vercel.json. Vercel automatically sends
// `Authorization: Bearer $CRON_SECRET` on cron-triggered requests when
// CRON_SECRET is set in the project's environment variables — set it there
// to enable this route outside of local dev.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runFeedTimeBasedGenerators();
  return NextResponse.json({ ok: true, ...result });
}
