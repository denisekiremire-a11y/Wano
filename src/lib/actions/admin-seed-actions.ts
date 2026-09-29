"use server";

import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/admin-action-log";
import { requireAdminLevel } from "@/lib/auth";
import { backfillFeedItems } from "@/lib/feed-generators";
import {
  backfillEditorialJourneysJ1,
  seedAfconVenueVendors,
  seedDemoInfluencer,
  seedDemoInventory,
  seedDemoRewards,
  seedJournalPosts,
  seedLaunchClubs,
} from "@/lib/seed-content";

/** One-time (but safe to re-run) production bootstrap for Milestone S:
 * seeds the 6 Journal guide posts and the 4 launch clubs (with placeholder
 * hosts and a scheduled meetup each) if they don't already exist, then
 * backfills feed_items from everything that exists — the demo content just
 * seeded, plus real listings/reviews/promo codes/posts that predate the
 * feed generator and were never retroactively picked up. */
export async function runMilestoneSBackfillAction() {
  const session = await requireAdminLevel("super");

  const journal = await seedJournalPosts(session.userId);
  const clubsResult = await seedLaunchClubs(session.userId);
  const feed = await backfillFeedItems();
  await logAdminAction(session.userId, "seed.milestone_s_run", "Ran the Milestone S backfill (journal, clubs, feed)");

  return { journal, clubs: clubsResult, feed };
}

/** One-time (safe to re-run) production bootstrap for Milestone J, Phase
 * J1: backfills cost range/region/duration and day-by-day stops for the 5
 * editorial journeys, then publishes each once it has both. */
export async function runJourneysJ1BackfillAction() {
  const session = await requireAdminLevel("super");
  const result = await backfillEditorialJourneysJ1();
  await logAdminAction(session.userId, "seed.journeys_j1_run", "Ran the Journeys J1 backfill");
  return result;
}

/** One-time (safe to re-run) demo-content bootstrap: ten fictional but
 * fully bookable listings per type (hotel, restaurant, experience,
 * transport, spa_salon), ten demo events, and twelve demo clubs (three per
 * launch category) with a scheduled meetup each — enough breadth to click
 * through the whole app live. */
export async function runDemoInventoryBackfillAction() {
  const session = await requireAdminLevel("super");
  const result = await seedDemoInventory(session.userId);
  await logAdminAction(session.userId, "seed.demo_inventory_run", "Ran the demo inventory seed");
  return result;
}

/** One-time (safe to re-run) demo bootstrap for the Influencer feature: one
 * traveller account boosted to 1,000 followers, with three posts boosted
 * to 300 / 800 / 500 likes — spanning below, well above, and exactly at the
 * 500-like earning threshold, so /admin/influencers has something to show
 * without needing real follower/like activity. */
export async function runDemoInfluencerBackfillAction() {
  const session = await requireAdminLevel("super");
  const result = await seedDemoInfluencer();
  await logAdminAction(session.userId, "seed.demo_influencer_run", "Ran the demo influencer seed");
  revalidatePath("/admin/influencers");
  return result;
}

/** One-time (safe to re-run) demo bootstrap for the launch Match Day
 * prizes: a Fun Zone win at Le Chateau Brasserie, and the XP draw grand
 * prize at Jinja Riverside Hotel. */
export async function runDemoRewardsBackfillAction() {
  const session = await requireAdminLevel("super");
  const result = await seedDemoRewards();
  await logAdminAction(session.userId, "seed.demo_rewards_run", "Ran the demo Match Day rewards seed");
  revalidatePath("/admin/rewards");
  revalidatePath("/admin/funzone");
  revalidatePath("/admin/match-day");
  return result;
}

/** One-off (safe to re-run) demo vendors for the AFCON venue pages — one
 * hotel/restaurant/experience/transport listing near each of Namboole and
 * Hoima, with real coordinates so the /afcon/[venue] distance sort has
 * something to show. */
export async function runAfconVenueVendorsSeedAction() {
  const session = await requireAdminLevel("super");
  const result = await seedAfconVenueVendors();
  await logAdminAction(session.userId, "seed.afcon_venue_vendors_run", "Ran the AFCON venue vendors seed");
  revalidatePath("/afcon");
  revalidatePath("/afcon/namboole");
  revalidatePath("/afcon/hoima");
  revalidatePath("/explore");
  return result;
}
