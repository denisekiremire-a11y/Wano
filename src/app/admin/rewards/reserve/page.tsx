import Link from "next/link";
import { getPointsReserveStatus } from "@/lib/data/points-reserve";
import { requireAdminPage } from "@/lib/auth";
import { formatMinor } from "@/lib/currency";

export default async function PointsReservePage() {
  await requireAdminPage("/admin/rewards/reserve");
  const status = await getPointsReserveStatus();

  const sharePct = status.rewardsShareOfCommission != null ? Math.round(status.rewardsShareOfCommission * 100) : null;
  const guardrailPct = Math.round(status.guardrail * 100);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/rewards" className="eyebrow text-ink/40 hover:text-ink">
          ← Rewards
        </Link>
        <h1 className="font-serif-editorial mt-2 text-2xl text-ink">Points reserve</h1>
        <p className="mt-1 text-sm text-ink/60">
          Part B paid-bookings pilot only — the UGX cost of every point on the books, and whether rewards are
          outpacing what the pilot is actually earning in commission.
        </p>
      </div>

      <div className="border border-ink/10 bg-white p-6">
        <p className="eyebrow text-ink/40">Confirmed unspent points (all travellers)</p>
        <p className="font-mono-data mt-1 text-3xl text-ink">{formatMinor(status.confirmedUnspentMinor)}</p>
        <p className="mt-1 text-sm text-ink/60">Wano&apos;s outstanding liability for points earned but not yet spent or expired.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border border-ink/10 bg-white p-6">
          <p className="eyebrow text-ink/40">Issued this month</p>
          <p className="font-mono-data mt-1 text-2xl text-ink">{formatMinor(status.issuedThisMonthMinor)}</p>
        </div>
        <div className="border border-ink/10 bg-white p-6">
          <p className="eyebrow text-ink/40">Redeemed this month</p>
          <p className="font-mono-data mt-1 text-2xl text-ink">{formatMinor(status.redeemedThisMonthMinor)}</p>
        </div>
      </div>

      <div className="border border-ink/10 bg-white p-6">
        <div className="flex items-baseline justify-between">
          <p className="eyebrow text-ink/40">Rewards issued as a share of commission (this month)</p>
          <p className="font-mono-data text-lg text-ink/60">{sharePct != null ? `${sharePct}%` : "—"}</p>
        </div>
        <p className="mt-1 text-sm text-ink/60">Commission earned this month: {formatMinor(status.commissionThisMonthMinor)}</p>
        {status.overGuardrail && (
          <p className="mt-3 text-sm font-semibold text-red-700">
            Over the {guardrailPct}% guardrail — rewards issued are outpacing what the pilot is earning in commission.
          </p>
        )}
        {sharePct == null && <p className="mt-3 text-sm text-ink/60">No pilot commission yet this month.</p>}
      </div>
    </div>
  );
}
