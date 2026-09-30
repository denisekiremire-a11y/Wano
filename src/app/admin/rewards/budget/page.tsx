import Link from "next/link";
import { getBudgetStatus, WANO_BUDGET_WARNING_PCT } from "@/lib/data/budget";
import { requireAdminPage } from "@/lib/auth";

export default async function AdminBudgetPage() {
  await requireAdminPage("/admin/rewards/budget");
  const status = await getBudgetStatus();

  const barColor = status.exceeded ? "bg-red-600" : status.warning ? "bg-amber-500" : "bg-emerald-600";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/rewards" className="eyebrow text-ink/40 hover:text-ink">
          ← Rewards
        </Link>
        <h1 className="font-serif-editorial mt-2 text-2xl text-ink">Budget dashboard</h1>
        <p className="mt-1 text-sm text-ink/60">
          Only Wano&apos;s share of redeemed discounts counts against this month&apos;s budget — a venue&apos;s
          own share never does.
        </p>
      </div>

      <div className="border border-ink/10 bg-white p-6">
        <div className="flex items-baseline justify-between">
          <p className="font-mono-data text-3xl text-ink">
            {status.spentMinor.toLocaleString()} <span className="text-lg text-ink/40">/ {status.budgetMinor.toLocaleString()} UGX</span>
          </p>
          <p className="font-mono-data text-lg text-ink/60">{status.pct}%</p>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-ink/10">
          <div className={`h-full ${barColor}`} style={{ width: `${Math.min(status.pct, 100)}%` }} />
        </div>
        {status.exceeded && (
          <p className="mt-3 text-sm font-semibold text-red-700">
            Budget reached — every active Wano-funded reward has been auto-paused for the rest of the month.
          </p>
        )}
        {status.warning && !status.exceeded && (
          <p className="mt-3 text-sm font-semibold text-amber-700">
            Over {WANO_BUDGET_WARNING_PCT}% of this month&apos;s budget spent.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-sm font-medium text-ember">
        <Link href="/admin/rewards" className="hover:underline">
          Reward catalog →
        </Link>
        <Link href="/admin/rewards/settlement" className="hover:underline">
          Weekly settlement →
        </Link>
      </div>
    </div>
  );
}
