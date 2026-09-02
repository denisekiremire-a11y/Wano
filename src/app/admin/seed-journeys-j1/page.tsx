import { BackfillButton } from "./backfill-button";

export default function SeedJourneysJ1Page() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">
          One-time: migrate the 5 journeys into real itineraries
        </h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Sets a UGX cost range, region/city, duration, best season and difficulty on each of the 5
          editorial journeys, adds their day-by-day stops (linked to the real listings already seeded
          for them), and publishes each journey once it has both a cost range and at least one stop.
          Safe to click more than once — existing stops are never duplicated or overwritten.
        </p>
      </div>
      <BackfillButton />
    </div>
  );
}
