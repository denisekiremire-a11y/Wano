import Link from "next/link";
import { notFound } from "next/navigation";
import { getTravellerWithUserById } from "@/lib/data/admin";
import { getPointsSummary, searchTravellersForPoints, TIER_THRESHOLDS } from "@/lib/data/points";
import { requireAdminPage } from "@/lib/auth";
import { AdjustmentForm } from "./adjustment-form";

export default async function AdminPointsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; traveller?: string }>;
}) {
  await requireAdminPage("/admin/rewards/points");
  const params = await searchParams;

  const [results, summary, selected] = await Promise.all([
    params.q?.trim() ? searchTravellersForPoints(params.q) : Promise.resolve([]),
    params.traveller ? getPointsSummary(params.traveller) : Promise.resolve(null),
    params.traveller ? getTravellerWithUserById(params.traveller) : Promise.resolve(null),
  ]);
  if (params.traveller && !selected) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/rewards" className="eyebrow text-ink/40 hover:text-ink">
          ← Rewards
        </Link>
        <h1 className="font-serif-editorial mt-2 text-2xl text-ink">Points &amp; tiers</h1>
        <p className="mt-1 text-sm text-ink/60">
          Look up a traveller&apos;s Rewards points ledger and tier. Insider at {TIER_THRESHOLDS.insider.toLocaleString()}
          , Legend at {TIER_THRESHOLDS.legend.toLocaleString()} — based on points earned in the last 12 months.
        </p>
      </div>

      <form className="flex gap-3 border border-ink/10 bg-white p-4">
        <input
          name="q"
          defaultValue={params.q}
          placeholder="Search by name, email, or referral code"
          className="flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-ember"
        />
        <button
          type="submit"
          className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink/85"
        >
          Search
        </button>
      </form>

      {params.q && !params.traveller && (
        <div className="space-y-2">
          {results.length === 0 ? (
            <p className="text-sm text-ink/60">No travellers matched.</p>
          ) : (
            results.map(({ traveller, user }) => (
              <Link
                key={traveller.id}
                href={`/admin/rewards/points?traveller=${traveller.id}`}
                className="block border border-ink/10 bg-white p-3 hover:bg-ink/5"
              >
                <p className="text-sm font-semibold text-ink">{user.name}</p>
                <p className="text-xs text-ink/60">{user.email}</p>
              </Link>
            ))
          )}
        </div>
      )}

      {selected && summary && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border border-ink/10 bg-white p-4">
            <div>
              <p className="text-sm font-semibold text-ink">{selected.user.name}</p>
              <p className="text-xs text-ink/60">{selected.user.email}</p>
            </div>
            <Link href={`/admin/rewards/points?q=${params.q}`} className="eyebrow text-ink/40 hover:text-ink">
              Change traveller
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-px overflow-hidden border border-ink/10 bg-ink/10">
            <div className="bg-white p-4">
              <p className="eyebrow text-ink/40">Balance</p>
              <p className="font-mono-data mt-1 text-2xl text-ink">{summary.balance.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4">
              <p className="eyebrow text-ink/40">Earned (12mo)</p>
              <p className="font-mono-data mt-1 text-2xl text-ink">{summary.earnedLast12Months.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4">
              <p className="eyebrow text-ink/40">Tier</p>
              <p className="font-mono-data mt-1 text-2xl capitalize text-ink">{summary.tier ?? "—"}</p>
            </div>
          </div>

          <AdjustmentForm travellerId={selected.traveller.id} />

          <div className="space-y-2">
            <h3 className="eyebrow text-ink/40">Ledger</h3>
            {summary.ledger.length === 0 ? (
              <p className="text-sm text-ink/60">No points activity yet.</p>
            ) : (
              summary.ledger.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between border border-ink/10 bg-white p-3">
                  <div>
                    <p className="text-sm text-ink">{entry.reason}</p>
                    <p className="font-mono-data text-[11px] text-ink/40">
                      {entry.sourceType} · {entry.createdAt.toLocaleString()}
                    </p>
                  </div>
                  <span className={`font-mono-data text-sm font-semibold ${entry.delta >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {entry.delta >= 0 ? "+" : ""}
                    {entry.delta.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
