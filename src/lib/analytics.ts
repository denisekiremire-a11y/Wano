import "server-only";
import { db } from "@/db";
import { analyticsEvents } from "@/db/schema";

export type AnalyticsEventName =
  | "onboarding_started"
  | "onboarding_completed"
  | "search_performed"
  | "listing_viewed"
  | "booking_started"
  | "booking_completed"
  | "review_submitted"
  | "referral_sent"
  | "referral_converted";

/** Minimal product-analytics logger — writes one row per event. Deliberately
 * a DB table rather than a third-party SDK (PostHog/etc.) to avoid pulling
 * in an external service and API key just for this; swap the body for a
 * real analytics client later if needed, call sites stay the same.
 * Never throws — a logging failure should never break the user's action. */
export async function logEvent(
  eventName: AnalyticsEventName,
  opts: { userId?: string; role?: string; metadata?: Record<string, unknown> } = {},
) {
  try {
    await db.insert(analyticsEvents).values({
      eventName,
      userId: opts.userId ?? null,
      role: opts.role ?? null,
      metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
    });
  } catch {
    // Analytics is best-effort — swallow failures rather than surface them
    // to the user or interrupt the action that triggered this event.
  }
}
