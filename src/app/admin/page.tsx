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
  if (!delta) return <span className="font-mono-data text-ink/40">flat</span>;
  return <span className={`font-mono-data ${delta.positive ? "text-leaf" : "text-red-600"}`}>{delta.label}</span>;
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
          <p className="eyebrow text-ember">Overview</p>
          <h1 className="font-serif-editorial mt-1 text-3xl text-ink">The business, right now</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/bookings"
            className="rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
          >
            Manage bookings
          </Link>
          <Link
            href="/admin/journeys"
            className="rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
          >
            Manage journeys
          </Link>
          <Link
            href="/admin/supply-leads"
            className="rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
          >
            Supply leads
          </Link>
          <Link
            href="/admin/vendors"
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/85"
          >
            Review vendors
          </Link>
        </div>
      </div>

      {/* Row 1 — the headline number gets the wide column; the two supporting
          facts read as a short list, not a matching pair of cards. */}
      <div className="grid grid-cols-12 gap-x-8 gap-y-6">
        <div className="col-span-12 lg:col-span-7">
          <p className="eyebrow text-ink/40">Commission earned, all time</p>
          <p className="font-mono-data mt-2 text-6xl font-semibold tracking-tight text-ink sm:text-7xl">
            {formatCommission(dash.commissionAllTime)}
          </p>
          <div className="mt-8">
            <div className="flex items-baseline justify-between">
              <p className="eyebrow text-ink/40">Bookings, last 30 days</p>
              <p className="font-mono-data text-xs text-ink/40">
                {dash.dailyBookings.reduce((s, d) => s + d.count, 0)} total
              </p>
            </div>
            <div className="mt-3">
              <DashboardTrendChart days={dash.dailyBookings} />
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 lg:border-l lg:border-ink/10 lg:pl-8">
          <div className="border-b border-ink/10 pb-5">
            <p className="eyebrow text-ink/40">This week</p>
            <p className="font-mono-data mt-1.5 text-3xl font-semibold text-ink">
              {formatCommission(dash.commissionLast7)}
            </p>
            <p className="mt-1 text-sm">
              <DeltaTag delta={periodDelta(dash.commissionLast7, dash.commissionPrev7)} />
              <span className="text-ink/40"> vs the 7 days before</span>
            </p>
          </div>
          <div className="border-b border-ink/10 py-5">
            <p className="eyebrow text-ink/40">Last 30 days</p>
            <p className="font-mono-data mt-1.5 text-3xl font-semibold text-ink">
              {formatCommission(dash.commissionLast30)}
            </p>
            <p className="mt-1 text-sm">
              <DeltaTag delta={periodDelta(dash.commissionLast30, dash.commissionPrev30)} />
              <span className="text-ink/40"> vs the 30 days before</span>
            </p>
          </div>
          <div className="pt-5">
            <p className="eyebrow text-ink/40">Conversion</p>
            <p className="font-mono-data mt-1.5 text-3xl font-semibold text-ink">
              {conversionRate == null ? "—" : `${conversionRate.toFixed(0)}%`}
            </p>
            <p className="font-mono-data mt-1 text-sm text-ink/40">
              {dash.funnel.won} won of {decided || 0} decided
            </p>
          </div>
        </div>
      </div>

      {/* Row 2 — reversed emphasis from row 1: the funnel takes the narrow
          column here, the vendor list takes the wide one. */}
      <div className="grid grid-cols-12 gap-x-8 gap-y-6 border-t border-ink/10 pt-8">
        <div className="col-span-12 lg:col-span-5">
          <p className="eyebrow text-ink/40">Booking funnel</p>
          {funnelTotal === 0 ? (
            <p className="mt-3 text-sm text-ink/50">No bookings yet.</p>
          ) : (
            <>
              <svg viewBox="0 0 100 8" className="mt-4 h-3 w-full overflow-visible" preserveAspectRatio="none">
                {(() => {
                  const segments = [
                    { key: "won", value: dash.funnel.won, className: "fill-leaf" },
                    { key: "pending", value: dash.funnel.pending, className: "fill-ember" },
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
                  <span className="flex items-center gap-2 text-ink/70">
                    <span className="h-2 w-2 rounded-full bg-leaf" /> Won (confirmed + completed)
                  </span>
                  <span className="font-mono-data font-medium text-ink">{dash.funnel.won}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-ink/70">
                    <span className="h-2 w-2 rounded-full bg-ember" /> Pending / held
                  </span>
                  <span className="font-mono-data font-medium text-ink">{dash.funnel.pending}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-ink/70">
                    <span className="h-2 w-2 rounded-full bg-red-400" /> Lost (cancelled + expired)
                  </span>
                  <span className="font-mono-data font-medium text-ink">{dash.funnel.lost}</span>
                </li>
              </ul>
            </>
          )}
        </div>

        <div className="col-span-12 lg:col-span-7 lg:border-l lg:border-ink/10 lg:pl-8">
          <p className="eyebrow text-ink/40">Top vendors by commission</p>
          {dash.topVendors.length === 0 ? (
            <p className="mt-3 text-sm text-ink/50">No won bookings yet.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {dash.topVendors.map((vendor, i) => {
                const share = dash.topVendors[0].commission > 0 ? (vendor.commission / dash.topVendors[0].commission) * 100 : 0;
                return (
                  <li key={vendor.vendorProfileId} className="flex items-center gap-4">
                    <span
                      className={`font-serif-editorial w-5 shrink-0 text-right text-2xl leading-none ${
                        i === 0 ? "text-ink" : "text-ink/25"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-sm font-medium text-ink">{vendor.businessName}</p>
                        <p className="font-mono-data shrink-0 text-sm font-medium text-ink">
                          {formatCommission(vendor.commission)}
                        </p>
                      </div>
                      <div className="mt-1.5 h-1 rounded-full bg-ink/5">
                        <div className="h-1 rounded-full bg-ember" style={{ width: `${Math.max(share, 3)}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      <div className="grid gap-4 border-t border-ink/10 pt-8 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const content = (
            <>
              <p className="eyebrow text-ink/40">{card.label}</p>
              <p className="font-mono-data mt-2 text-3xl font-semibold text-ink">{card.value}</p>
            </>
          );
          return card.href ? (
            <Link
              key={card.label}
              href={card.href}
              className="border border-ink/10 bg-white p-5 transition-colors hover:border-ink/25"
            >
              {content}
            </Link>
          ) : (
            <div key={card.label} className="border border-ink/10 bg-white p-5">
              {content}
            </div>
          );
        })}
      </div>

      <section className="border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">Businesses per journey</h2>
        <div className="mt-4 border-t border-ink/10">
          {metrics.partnersPerJourney.map(({ journey, trusted, pending, bookings }) => (
            <div key={journey.id} className="flex items-center justify-between border-b border-ink/10 py-3">
              <div>
                <p className="font-medium text-ink">{journey.name}</p>
                <p className="eyebrow mt-0.5 text-ink/40">{journey.location}</p>
              </div>
              <div className="font-mono-data flex gap-4 text-sm text-ink/60">
                <span>{trusted} trusted</span>
                <span>{pending} pending</span>
                <span>{bookings} bookings</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-dashed border-ink/20 bg-white p-5">
        <h2 className="eyebrow text-ink/50">Demo &amp; setup tools</h2>
        <p className="mt-1 text-xs text-ink/50">
          One-off buttons for populating demo content — safe to click more than once.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/admin/seed-demo-inventory"
            className="rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
          >
            Seed demo inventory
          </Link>
          <Link
            href="/admin/influencers"
            className="rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
          >
            Seed demo influencer
          </Link>
          <Link
            href="/admin/seed-journeys-j1"
            className="rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
          >
            Migrate journeys (J1)
          </Link>
        </div>
      </section>
    </div>
  );
}
