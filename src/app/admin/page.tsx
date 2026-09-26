import Link from "next/link";
import { getCampaignMetrics, getDashboardMetrics } from "@/lib/data/admin";
import { requireAdminPage } from "@/lib/auth";
import { formatCommission } from "@/lib/currency";
import { DashboardTrendChart } from "./dashboard-trend-chart";

/** Signed, one-decimal percent change vs a named prior period — null when
 * the prior period was zero (a percent change against nothing is noise,
 * not a number: show "new" instead of a meaningless +/-∞%). */
function periodDelta(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? { label: "new", positive: true } : null;
  const pct = ((current - previous) / previous) * 100;
  return { label: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, positive: pct >= 0 };
}

function DeltaTag({ delta }: { delta: { label: string; positive: boolean } | null }) {
  if (!delta) return <span className="text-forest-800/40">flat</span>;
  return <span className={delta.positive ? "text-leaf" : "text-red-600"}>{delta.label}</span>;
}

export default async function AdminOverviewPage() {
  await requireAdminPage("/admin");
  const [metrics, dash] = await Promise.all([getCampaignMetrics(), getDashboardMetrics()]);

  const decided = dash.funnel.won + dash.funnel.lost;
  const conversionRate = decided > 0 ? (dash.funnel.won / decided) * 100 : null;
  const funnelTotal = dash.funnel.won + dash.funnel.pending + dash.funnel.lost;

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
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-forest-800/45">Overview</p>
          <h1 className="mt-1 font-display text-4xl text-forest-900">The business, right now</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/bookings"
            className="rounded-full border border-forest-800/20 px-4 py-2 text-sm font-semibold text-forest-800"
          >
            Manage bookings
          </Link>
          <Link
            href="/admin/journeys"
            className="rounded-full border border-forest-800/20 px-4 py-2 text-sm font-semibold text-forest-800"
          >
            Manage journeys
          </Link>
          <Link
            href="/admin/supply-leads"
            className="rounded-full border border-forest-800/20 px-4 py-2 text-sm font-semibold text-forest-800"
          >
            Supply leads
          </Link>
          <Link
            href="/admin/vendors"
            className="rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white"
          >
            Review vendors
          </Link>
        </div>
      </div>

      {/* Row 1 — the headline number gets the wide column; the two supporting
          facts read as a short list, not a matching pair of cards. */}
      <div className="grid grid-cols-12 gap-x-8 gap-y-6">
        <div className="col-span-12 lg:col-span-7">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-forest-800/45">Commission earned, all time</p>
          <p className="mt-2 text-6xl font-semibold tracking-tight text-forest-900 sm:text-7xl">
            {formatCommission(dash.commissionAllTime)}
          </p>
          <div className="mt-8">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-forest-800/45">Bookings, last 30 days</p>
              <p className="text-xs text-forest-800/45">{dash.dailyBookings.reduce((s, d) => s + d.count, 0)} total</p>
            </div>
            <div className="mt-3">
              <DashboardTrendChart days={dash.dailyBookings} />
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 lg:pl-8 lg:border-l lg:border-forest-900/10">
          <div className="border-b border-forest-900/10 pb-5">
            <p className="text-xs font-medium uppercase tracking-wide text-forest-800/45">This week</p>
            <p className="mt-1.5 text-3xl font-semibold text-forest-900">{formatCommission(dash.commissionLast7)}</p>
            <p className="mt-1 text-sm">
              <DeltaTag delta={periodDelta(dash.commissionLast7, dash.commissionPrev7)} />
              <span className="text-forest-800/45"> vs the 7 days before</span>
            </p>
          </div>
          <div className="border-b border-forest-900/10 py-5">
            <p className="text-xs font-medium uppercase tracking-wide text-forest-800/45">Last 30 days</p>
            <p className="mt-1.5 text-3xl font-semibold text-forest-900">{formatCommission(dash.commissionLast30)}</p>
            <p className="mt-1 text-sm">
              <DeltaTag delta={periodDelta(dash.commissionLast30, dash.commissionPrev30)} />
              <span className="text-forest-800/45"> vs the 30 days before</span>
            </p>
          </div>
          <div className="pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-forest-800/45">Conversion</p>
            <p className="mt-1.5 text-3xl font-semibold text-forest-900">
              {conversionRate == null ? "—" : `${conversionRate.toFixed(0)}%`}
            </p>
            <p className="mt-1 text-sm text-forest-800/45">
              {dash.funnel.won} won of {decided || 0} decided
            </p>
          </div>
        </div>
      </div>

      {/* Row 2 — reversed emphasis from row 1: the funnel takes the narrow
          column here, the vendor list takes the wide one. */}
      <div className="grid grid-cols-12 gap-x-8 gap-y-6 border-t border-forest-900/10 pt-8">
        <div className="col-span-12 lg:col-span-5">
          <p className="text-xs font-medium uppercase tracking-wide text-forest-800/45">Booking funnel</p>
          {funnelTotal === 0 ? (
            <p className="mt-3 text-sm text-forest-800/50">No bookings yet.</p>
          ) : (
            <>
              <svg viewBox="0 0 100 8" className="mt-4 h-3 w-full overflow-visible" preserveAspectRatio="none">
                {(() => {
                  const segments = [
                    { key: "won", value: dash.funnel.won, className: "fill-leaf" },
                    { key: "pending", value: dash.funnel.pending, className: "fill-marigold-400" },
                    { key: "lost", value: dash.funnel.lost, className: "fill-red-400" },
                  ].filter((s) => s.value > 0);
                  let x = 0;
                  const gap = 0.6;
                  return segments.map((seg, i) => {
                    const raw = (seg.value / funnelTotal) * 100;
                    const width = Math.max(0, raw - (i === segments.length - 1 ? 0 : gap));
                    const rect = (
                      <rect key={seg.key} x={x} y={0} width={width} height={8} rx={1.5} className={seg.className}>
                        <title>{`${seg.key}: ${seg.value}`}</title>
                      </rect>
                    );
                    x += raw;
                    return rect;
                  });
                })()}
              </svg>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-forest-800/70">
                    <span className="h-2 w-2 rounded-full bg-leaf" /> Won (confirmed + completed)
                  </span>
                  <span className="font-medium tabular-nums text-forest-900">{dash.funnel.won}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-forest-800/70">
                    <span className="h-2 w-2 rounded-full bg-marigold-400" /> Pending / held
                  </span>
                  <span className="font-medium tabular-nums text-forest-900">{dash.funnel.pending}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-forest-800/70">
                    <span className="h-2 w-2 rounded-full bg-red-400" /> Lost (cancelled + expired)
                  </span>
                  <span className="font-medium tabular-nums text-forest-900">{dash.funnel.lost}</span>
                </li>
              </ul>
            </>
          )}
        </div>

        <div className="col-span-12 lg:col-span-7 lg:pl-8 lg:border-l lg:border-forest-900/10">
          <p className="text-xs font-medium uppercase tracking-wide text-forest-800/45">Top vendors by commission</p>
          {dash.topVendors.length === 0 ? (
            <p className="mt-3 text-sm text-forest-800/50">No won bookings yet.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {dash.topVendors.map((vendor, i) => {
                const share = dash.topVendors[0].commission > 0 ? (vendor.commission / dash.topVendors[0].commission) * 100 : 0;
                return (
                  <li key={vendor.vendorProfileId} className="flex items-center gap-4">
                    <span
                      className={`w-5 shrink-0 text-right font-display text-2xl leading-none ${
                        i === 0 ? "text-forest-900" : "text-forest-900/25"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-sm font-medium text-forest-900">{vendor.businessName}</p>
                        <p className="shrink-0 text-sm font-medium tabular-nums text-forest-900">
                          {formatCommission(vendor.commission)}
                        </p>
                      </div>
                      <div className="mt-1.5 h-1 rounded-full bg-forest-900/5">
                        <div className="h-1 rounded-full bg-nile-700" style={{ width: `${Math.max(share, 3)}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      <div className="grid gap-4 border-t border-forest-900/10 pt-8 sm:grid-cols-2 lg:grid-cols-3">
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

      <section className="rounded-2xl border border-dashed border-forest-900/20 bg-white p-5">
        <h2 className="font-display text-sm font-semibold text-forest-900">Demo &amp; setup tools</h2>
        <p className="mt-0.5 text-xs text-forest-800/60">
          One-off buttons for populating demo content — safe to click more than once.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/admin/seed-demo-inventory"
            className="rounded-full border border-forest-800/20 px-4 py-2 text-sm font-semibold text-forest-800"
          >
            Seed demo inventory
          </Link>
          <Link
            href="/admin/influencers"
            className="rounded-full border border-forest-800/20 px-4 py-2 text-sm font-semibold text-forest-800"
          >
            Seed demo influencer
          </Link>
          <Link
            href="/admin/seed-journeys-j1"
            className="rounded-full border border-forest-800/20 px-4 py-2 text-sm font-semibold text-forest-800"
          >
            Migrate journeys (J1)
          </Link>
        </div>
      </section>
    </div>
  );
}
