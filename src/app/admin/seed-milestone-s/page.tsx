import { BackfillButton } from "./backfill-button";

export default function SeedMilestoneSPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">One-time: seed Milestone S content</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Creates the 6 Journal guide posts and the 4 launch clubs (placeholder host + a scheduled meetup
          each) if they don&apos;t already exist, then backfills the Social feed from everything that
          exists — this demo content plus your real listings, reviews, and promo codes. Safe to click more
          than once; nothing is duplicated.
        </p>
      </div>
      <BackfillButton />
    </div>
  );
}
