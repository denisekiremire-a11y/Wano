import Link from "next/link";
import { getWeeklySettlement, getWeekRange } from "@/lib/data/settlement";
import { requireAdminPage } from "@/lib/auth";

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function AdminSettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await requireAdminPage("/admin/rewards/settlement");
  const params = await searchParams;
  const anchor = params.week ? new Date(params.week) : new Date();
  const { start, end } = getWeekRange(anchor);
  const rows = await getWeeklySettlement(start, end);

  const prevWeekStart = new Date(start);
  prevWeekStart.setDate(start.getDate() - 7);
  const nextWeekStart = new Date(start);
  nextWeekStart.setDate(start.getDate() + 7);
  const displayEnd = new Date(end);
  displayEnd.setDate(end.getDate() - 1);

  const totals = rows.reduce(
    (acc, r) => ({
      redemptionCount: acc.redemptionCount + r.redemptionCount,
      totalDiscountMinor: acc.totalDiscountMinor + r.totalDiscountMinor,
      wanoShareMinor: acc.wanoShareMinor + r.wanoShareMinor,
      venueShareMinor: acc.venueShareMinor + r.venueShareMinor,
    }),
    { redemptionCount: 0, totalDiscountMinor: 0, wanoShareMinor: 0, venueShareMinor: 0 },
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/rewards" className="eyebrow text-ink/40 hover:text-ink">
          ← Rewards
        </Link>
        <h1 className="font-serif-editorial mt-2 text-2xl text-ink">Weekly settlement</h1>
        <p className="mt-1 text-sm text-ink/60">
          Redemptions and each venue&apos;s share of discounts, for vendors paid weekly.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border border-ink/10 bg-white p-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/rewards/settlement?week=${prevWeekStart.toISOString().slice(0, 10)}`}
            className="rounded-full border border-ink/20 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5"
          >
            ← Prev week
          </Link>
          <p className="font-mono-data text-sm text-ink">
            {fmtDate(start)} – {fmtDate(displayEnd)}
          </p>
          <Link
            href={`/admin/rewards/settlement?week=${nextWeekStart.toISOString().slice(0, 10)}`}
            className="rounded-full border border-ink/20 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-ink/5"
          >
            Next week →
          </Link>
        </div>
        <a
          href={`/admin/rewards/settlement/export?week=${start.toISOString().slice(0, 10)}`}
          className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white transition hover:bg-ink/85"
        >
          Export CSV
        </a>
      </div>

      <div className="overflow-x-auto border border-ink/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-ink/50">
              <th className="p-3 font-medium">Venue</th>
              <th className="p-3 font-medium">Redemptions</th>
              <th className="p-3 font-medium">Total discount</th>
              <th className="p-3 font-medium">Wano share</th>
              <th className="p-3 font-medium">Venue share</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-ink/50">
                  No redemptions this week.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.vendorProfileId} className="border-b border-ink/5">
                  <td className="p-3 text-ink">{r.businessName}</td>
                  <td className="font-mono-data p-3 text-ink/70">{r.redemptionCount}</td>
                  <td className="font-mono-data p-3 text-ink/70">{r.totalDiscountMinor.toLocaleString()}</td>
                  <td className="font-mono-data p-3 text-ink/70">{r.wanoShareMinor.toLocaleString()}</td>
                  <td className="font-mono-data p-3 font-semibold text-ink">{r.venueShareMinor.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-ink/10 font-semibold text-ink">
                <td className="p-3">Total</td>
                <td className="font-mono-data p-3">{totals.redemptionCount}</td>
                <td className="font-mono-data p-3">{totals.totalDiscountMinor.toLocaleString()}</td>
                <td className="font-mono-data p-3">{totals.wanoShareMinor.toLocaleString()}</td>
                <td className="font-mono-data p-3">{totals.venueShareMinor.toLocaleString()}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
