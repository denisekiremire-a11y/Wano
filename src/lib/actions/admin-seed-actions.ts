"use server";

import { requireRole } from "@/lib/auth";
import { backfillFeedItems } from "@/lib/feed-generators";
import { backfillEditorialJourneysJ1, seedJournalPosts, seedLaunchClubs } from "@/lib/seed-content";

/** One-time (but safe to re-run) production bootstrap for Milestone S:
 * seeds the 6 Journal guide posts and the 4 launch clubs (with placeholder
 * hosts and a scheduled meetup each) if they don't already exist, then
 * backfills feed_items from everything that exists — the demo content just
 * seeded, plus real listings/reviews/promo codes/posts that predate the
 * feed generator and were never retroactively picked up. */
export async function runMilestoneSBackfillAction() {
  const session = await requireRole("admin");

  const journal = await seedJournalPosts(session.userId);
  const clubsResult = await seedLaunchClubs(session.userId);
  const feed = await backfillFeedItems();

  return { journal, clubs: clubsResult, feed };
}

/** One-time (safe to re-run) production bootstrap for Milestone J, Phase
 * J1: backfills cost range/region/duration and day-by-day stops for the 5
 * editorial journeys, then publishes each once it has both. */
export async function runJourneysJ1BackfillAction() {
  await requireRole("admin");
  return backfillEditorialJourneysJ1();
}
