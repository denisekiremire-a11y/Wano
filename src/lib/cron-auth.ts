import { NextResponse } from "next/server";

// Shared auth check for /api/cron/*. Vercel Cron sends
// `Authorization: Bearer $CRON_SECRET` on cron-triggered requests when
// CRON_SECRET is set in the project's environment variables. If it isn't
// set, the routes refuse every request (503) rather than running open to
// anyone — except under `next dev`, so local runs still work without it.
//
// Returns a response to send back when the request isn't allowed, or null
// when the route should go ahead.
export function rejectUnauthorizedCron(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "development") return null;
    console.error("CRON_SECRET is not set — refusing cron request.");
    return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
