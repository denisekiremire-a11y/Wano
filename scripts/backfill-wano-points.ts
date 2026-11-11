// One-off backfill: writes points_ledger rows for historical actions that
// earned XP before awardPoints() existed, so existing (seed/demo) balances
// aren't zeroed out by this change. Idempotent — safe to re-run, since
// every insert is guarded by a "does a ledger row for this sourceId already
// exist" check.
//
// Scope: stamps, challenges, reviews, completed bookings (+ their group
// guests), trail completions, non-points Daily Drop redemptions, weekly
// challenge completions, and the one-time profile-complete bonus — every
// source with its own dedicated table row to key off of.
//
// NOT backfilled (no dedicated row to key off of; would need to replay
// check-in history, with real risk of double-counting on a one-off script):
// area stamps, friend-first-visit, streak milestones, XP/points Drops.
// Those breakdown rows read 0 for existing demo travellers until new
// check-in activity happens after this ships. Explicitly accepted scope —
// see PR description.
//
// Plain SQL via the `postgres` client (not drizzle's query builder) so
// this has no dependency-load-order issues with reading DATABASE_URL from
// .env.local — same approach used elsewhere this session for one-off
// scripts against the dev DB.
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import postgres from "postgres";

const STAMP_XP = 100;
const CHALLENGE_XP = 50;
const REVIEW_XP = 30;
const BOOKING_COMPLETION_XP = 100;
const DROP_REDEMPTION_XP = 50;
const PROFILE_COMPLETE_XP = 50;
const POINTS_UNLOCK_THRESHOLD = 1000;

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  let inserted = 0;

  async function backfill(
    sourceType: string,
    rows: { id: string; travellerId: string; delta: number; reason: string; createdAt?: Date }[],
  ) {
    if (rows.length === 0) return;
    const existing = await sql<{ source_id: string }[]>`
      select source_id from points_ledger
      where source_type = ${sourceType} and source_id = any(${rows.map((r) => r.id)})
    `;
    const done = new Set(existing.map((r) => r.source_id));
    for (const r of rows) {
      if (done.has(r.id)) continue;
      await sql`
        insert into points_ledger (traveller_id, delta, reason, source_type, source_id, created_at)
        values (${r.travellerId}, ${r.delta}, ${r.reason}, ${sourceType}, ${r.id}, ${r.createdAt ?? new Date()})
      `;
      inserted++;
    }
  }

  // Stamps
  await backfill(
    "stamp",
    (await sql`select id, traveller_id, earned_at from stamps`).map((r) => ({
      id: r.id,
      travellerId: r.traveller_id,
      delta: STAMP_XP,
      reason: "Passport stamp",
      createdAt: r.earned_at,
    })),
  );

  // Verified challenge completions
  await backfill(
    "challenge",
    (
      await sql`select id, traveller_id, completed_at from challenge_completions where status = 'verified'`
    ).map((r) => ({
      id: r.id,
      travellerId: r.traveller_id,
      delta: CHALLENGE_XP,
      reason: "Challenge completed",
      createdAt: r.completed_at ?? undefined,
    })),
  );

  // Reviews
  await backfill(
    "review",
    (await sql`select id, traveller_id, created_at from reviews`).map((r) => ({
      id: r.id,
      travellerId: r.traveller_id,
      delta: REVIEW_XP,
      reason: "Review written",
      createdAt: r.created_at,
    })),
  );

  // Completed bookings — the booker
  const completedBookings = await sql`select id, traveller_id, created_at from bookings where status = 'completed'`;
  await backfill(
    "booking_completion_xp",
    completedBookings.map((r) => ({
      id: r.id,
      travellerId: r.traveller_id,
      delta: BOOKING_COMPLETION_XP,
      reason: "Booking completed",
      createdAt: r.created_at,
    })),
  );
  // ...and their group-booking guests
  if (completedBookings.length > 0) {
    const guests = await sql`
      select id, traveller_id, booking_id from booking_guests
      where booking_id = any(${completedBookings.map((r) => r.id)})
    `;
    const bookingCreatedAt = new Map(completedBookings.map((r) => [r.id, r.created_at]));
    await backfill(
      "group_outing",
      guests.map((g) => ({
        id: g.id,
        travellerId: g.traveller_id,
        delta: BOOKING_COMPLETION_XP,
        reason: "Group outing completed",
        createdAt: bookingCreatedAt.get(g.booking_id),
      })),
    );
  }

  // Trail completions
  await backfill(
    "trail_completion",
    (
      await sql`
        select tc.id, tc.traveller_id, tc.completed_at, t.bonus_xp
        from trail_completions tc
        join trails t on t.id = tc.trail_id
      `
    ).map((r) => ({
      id: r.id,
      travellerId: r.traveller_id,
      delta: r.bonus_xp,
      reason: "Trail completed",
      createdAt: r.completed_at,
    })),
  );

  // Non-points-type Daily Drop redemptions (points-type ones already
  // granted their own reward_redemption ledger row via the original
  // discountType="points" path in markRewardRedeemedAction)
  await backfill(
    "drop_redemption",
    (
      await sql`
        select ur.id, ur.traveller_id, ur.redeemed_at
        from user_rewards ur
        join rewards r on r.id = ur.reward_id
        where ur.status = 'redeemed' and r.source = 'drop' and r.discount_type != 'points'
      `
    ).map((r) => ({
      id: r.id,
      travellerId: r.traveller_id,
      delta: DROP_REDEMPTION_XP,
      reason: "Daily Drop used",
      createdAt: r.redeemed_at ?? undefined,
    })),
  );

  // Weekly challenge completions
  await backfill(
    "weekly_challenge",
    (
      await sql`
        select wcc.id, wcc.traveller_id, wcc.completed_at, wc.xp, wc.title
        from weekly_challenge_completions wcc
        join weekly_challenges wc on wc.id = wcc.weekly_challenge_id
      `
    ).map((r) => ({
      id: r.id,
      travellerId: r.traveller_id,
      delta: r.xp,
      reason: `Weekly challenge: ${r.title}`,
      createdAt: r.completed_at,
    })),
  );

  // One-time profile-complete bonus — no dedicated row, so handled
  // separately (keyed on traveller_id, not source_id).
  {
    const profiles = await sql`
      select id from traveller_profiles
      where persona is not null and city is not null
        and exists (select 1 from traveller_interests ti where ti.traveller_id = traveller_profiles.id)
    `;
    const already = new Set(
      (
        await sql`select traveller_id from points_ledger where source_type = 'profile_complete'`
      ).map((r) => r.traveller_id),
    );
    for (const p of profiles) {
      if (already.has(p.id)) continue;
      await sql`
        insert into points_ledger (traveller_id, delta, reason, source_type)
        values (${p.id}, ${PROFILE_COMPLETE_XP}, 'Profile complete', 'profile_complete')
      `;
      inserted++;
    }
  }

  // The backfill inserts directly (bypassing awardPoints), so it has to
  // set points_unlocked_at itself for anyone whose backfilled balance now
  // crosses the threshold — same rule awardPoints applies going forward.
  const toUnlock = await sql`
    select traveller_id, sum(delta)::int as balance
    from points_ledger
    group by traveller_id
    having sum(delta) >= ${POINTS_UNLOCK_THRESHOLD}
  `;
  if (toUnlock.length > 0) {
    await sql`
      update traveller_profiles
      set points_unlocked_at = coalesce(points_unlocked_at, now())
      where id = any(${toUnlock.map((r) => r.traveller_id)})
    `;
  }
  console.log(`Unlocked spending for ${toUnlock.length} traveller(s) already at/above ${POINTS_UNLOCK_THRESHOLD}.`);

  console.log(`Backfill complete — inserted ${inserted} points_ledger rows.`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
