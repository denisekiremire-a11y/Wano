import Link from "next/link";
import { getCampaignMetrics } from "@/lib/data/admin";

export default async function AdminOverviewPage() {
  const metrics = await getCampaignMetrics();

  const cards = [
    { label: "Verified businesses", value: metrics.totalPartners, href: "/admin/vendors" },
    { label: "Pending review", value: metrics.pendingPartners, href: "/admin/vendors" },
    { label: "Total bookings", value: metrics.totalBookings, href: "/admin/bookings" },
    { label: "Registered members", value: metrics.totalTravellers, href: "/admin/travellers" },
    {
      label: "Passport completions (5/5)",
      value: metrics.passportCompletions,
      href: "/admin/travellers",
    },
    { label: "Challenges completed", value: metrics.challengesCompleted },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-900">
            Campaign metrics
          </h1>
          <p className="mt-1 text-sm text-forest-800/60">
            The success measures behind the Wano platform.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/bookings"
            className="rounded-full border border-forest-800/20 px-4 py-2 text-sm font-semibold text-forest-800"
          >
            Manage bookings
          </Link>
          <Link
            href="/admin/vendors"
            className="rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white"
          >
            Review vendors
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const content = (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-forest-800/50">
                {card.label}
              </p>
              <p className="mt-2 font-display text-3xl font-semibold text-forest-900">
                {card.value}
              </p>
            </>
          );
          return card.href ? (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-2xl border border-forest-900/10 bg-white p-5 transition hover:shadow-md"
            >
              {content}
            </Link>
          ) : (
            <div key={card.label} className="rounded-2xl border border-forest-900/10 bg-white p-5">
              {content}
            </div>
          );
        })}
      </div>

      <section className="rounded-2xl border border-forest-900/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-forest-900">Businesses per journey</h2>
        <div className="mt-4 space-y-3">
          {metrics.partnersPerJourney.map(({ journey, trusted, pending, bookings }) => (
            <div key={journey.id} className="flex items-center justify-between border-b border-forest-900/5 pb-3 last:border-0">
              <div>
                <p className="font-medium text-forest-900">{journey.name}</p>
                <p className="text-xs text-forest-800/50">{journey.location}</p>
              </div>
              <div className="flex gap-4 text-sm text-forest-800/70">
                <span>{trusted} trusted</span>
                <span>{pending} pending</span>
                <span>{bookings} bookings</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
