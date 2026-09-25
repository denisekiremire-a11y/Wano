import { NextResponse } from "next/server";
import { rejectUnauthorizedCron } from "@/lib/cron-auth";
import { runFeedTimeBasedGenerators } from "@/lib/feed-generators";

// Generates the feed_items that aren't triggered by a user action —
// event_upcoming, event_momentum, perk_expiring — for anything that just
// crossed its time threshold. Every insert is dedupe-key idempotent, so
// re-running this (a retry, an overlapping invocation) is always safe.
//
// Wired to Vercel Cron via vercel.json. Auth is rejectUnauthorizedCron —
// CRON_SECRET must be set in the project's environment variables or this
// route refuses every request outside of local dev.
export async function GET(request: Request) {
  const rejected = rejectUnauthorizedCron(request);
  if (rejected) return rejected;

  const result = await runFeedTimeBasedGenerators();
  return NextResponse.json({ ok: true, ...result });
}
