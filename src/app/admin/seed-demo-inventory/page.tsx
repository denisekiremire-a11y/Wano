import { BackfillButton } from "./backfill-button";

export default function SeedDemoInventoryPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">
          One-time: seed demo inventory
        </h1>
        <p className="mt-1 text-sm text-forest-800/60">
          Creates ten fictional but fully bookable listings per type (hotels, restaurants,
          experiences, transport, spa &amp; salon), each with its own pre-trusted demo partner
          account so they show up immediately in Explore and Home — no accreditation wait. Also
          adds ten demo events and twelve demo clubs (three per launch category, each with a
          scheduled meetup). Names and prices are made up for demo purposes. Safe to click more
          than once — anything already created by title/name is skipped, not duplicated.
        </p>
      </div>
      <BackfillButton />
    </div>
  );
}
