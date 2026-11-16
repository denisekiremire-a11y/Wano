import type { Metadata } from "next";
import { CurrencyNote } from "@/components/site/Notices";
import { formatAED, formatUGX } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { getRegistry } from "@/lib/registry-cache";
import { liveTotals } from "@/lib/totals";

export const metadata: Metadata = { title: "Budget summary" };

function Approx({ v }: { v: number | null }) {
  return <>{v === null ? "—" : `~${new Intl.NumberFormat("en-US").format(v)}`}</>;
}

export default async function BudgetPage() {
  const { gifts, categories, settings } = await getRegistry();
  const t = liveTotals(gifts, categories);
  const rate = settings.aed_to_ugx_rate;
  const alternatives = gifts.filter((g) => g.is_alternative);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="eyebrow">Budget summary</p>
      <h1 className="mt-1 text-4xl sm:text-5xl">What the list adds up to</h1>
      <p className="mt-3 max-w-3xl text-ink-soft">
        The original wishlist{settings.prices_recorded_on ? `, made on ${formatDate(settings.prices_recorded_on)},` : ""} included its own
        approximate budget. It is preserved below exactly as written, next to totals calculated live from the gifts on this registry.
      </p>

      <section className="mt-10" aria-labelledby="orig">
        <h2 id="orig" className="text-3xl">
          The original document’s estimates
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="card p-6">
            <p className="eyebrow">Budget</p>
            <p className="mt-2 font-display text-5xl" data-testid="doc-budget-total">
              ~{new Intl.NumberFormat("en-US").format(settings.doc_budget_total_aed ?? 0)} AED
            </p>
            <p className="mt-1 text-sm text-muted">One of each essential, cheaper option</p>
          </div>
          <div className="card p-6">
            <p className="eyebrow">Full wishlist</p>
            <p className="mt-2 font-display text-5xl" data-testid="doc-full-total">
              ~{new Intl.NumberFormat("en-US").format(settings.doc_full_total_aed ?? 0)} AED
            </p>
            <p className="mt-1 text-sm text-muted">Premium picks plus every extra</p>
          </div>
        </div>
        <div className="card mt-4 overflow-x-auto">
          <table className="admin-table min-w-[480px]">
            <thead>
              <tr>
                <th>Category</th>
                <th className="text-right">Budget (AED)</th>
                <th className="text-right">Full wishlist (AED)</th>
              </tr>
            </thead>
            <tbody>
              {t.byCategory.map((c) => (
                <tr key={c.category.id}>
                  <td>{c.category.name}</td>
                  <td className="text-right tabular-nums">
                    <Approx v={c.docBudget} />
                  </td>
                  <td className="text-right tabular-nums">
                    <Approx v={c.docFull} />
                  </td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td>Total</td>
                <td className="text-right tabular-nums">
                  <Approx v={settings.doc_budget_total_aed} />
                </td>
                <td className="text-right tabular-nums">
                  <Approx v={settings.doc_full_total_aed} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {settings.doc_totals_note && <p className="mt-3 text-sm text-ink-soft">{settings.doc_totals_note}</p>}
      </section>

      <section className="mt-14" aria-labelledby="live">
        <h2 id="live" className="text-3xl">
          Live totals from the registry
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-soft">
          Each gift counts at its sale price if it has one, otherwise its listed price, otherwise the middle of its estimated range (the
          same rule the original list used). These numbers update when the family edits prices or adds gifts.
        </p>
        <div className="card mt-4 overflow-x-auto">
          <table className="admin-table min-w-[640px]">
            <thead>
              <tr>
                <th>Category</th>
                <th className="text-right">Items</th>
                <th className="text-right">Budget selection</th>
                <th className="text-right">Full selection</th>
                <th className="text-right">All except alternatives</th>
              </tr>
            </thead>
            <tbody>
              {t.byCategory.map((c) => (
                <tr key={c.category.id}>
                  <td>{c.category.name}</td>
                  <td className="text-right tabular-nums">
                    {c.items}
                    {c.alternatives ? <span className="text-muted"> ({c.alternatives} alt.)</span> : null}
                  </td>
                  <td className="text-right tabular-nums">{formatAED(c.liveBudget)}</td>
                  <td className="text-right tabular-nums">{formatAED(c.liveFull)}</td>
                  <td className="text-right tabular-nums">{formatAED(c.liveAllExcludingAlternatives)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td>Total</td>
                <td className="text-right tabular-nums">{gifts.length}</td>
                <td className="text-right tabular-nums" data-testid="live-budget-total">
                  {formatAED(t.budget)}
                  {rate ? <div className="text-xs font-normal text-muted">≈ {formatUGX(t.budget, rate)}</div> : null}
                </td>
                <td className="text-right tabular-nums" data-testid="live-full-total">
                  {formatAED(t.full)}
                  {rate ? <div className="text-xs font-normal text-muted">≈ {formatUGX(t.full, rate)}</div> : null}
                </td>
                <td className="text-right tabular-nums">
                  {formatAED(t.allExcludingAlternatives)}
                  {rate ? <div className="text-xs font-normal text-muted">≈ {formatUGX(t.allExcludingAlternatives, rate)}</div> : null}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-ink-soft md:grid-cols-2">
          <div className="rounded-2xl bg-cream/70 p-4">
            <p className="font-medium text-ink">What’s included</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong>Budget selection</strong> — the gifts that make up the original “budget” scenario (the cheaper option for each need).
              </li>
              <li>
                <strong>Full selection</strong> — the gifts that make up the original “full wishlist” scenario (premium picks plus extras).
              </li>
              <li>
                <strong>All except alternatives</strong> — every gift on the registry except the {alternatives.length} alternatives, which
                would double-count a need.
              </li>
            </ul>
          </div>
          <div className="rounded-2xl bg-cream/70 p-4">
            <p className="font-medium text-ink">Why the live totals differ from the original</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>The original budget assumed buying the bedside cot online (~AED 1,353); the registry uses its in-store price (AED 1,691).</li>
              <li>Clothing on the registry uses sale prices where they were recorded.</li>
              <li>
                The original document doesn’t say which extras make up its Extras figures, so no extras are counted in the budget selection
                and all of them are counted in the full selection.
              </li>
            </ul>
          </div>
        </div>
        {alternatives.length > 0 && (
          <p className="mt-4 text-sm text-muted">Alternatives (not counted): {alternatives.map((g) => g.name).join(", ")}.</p>
        )}
        <div className="mt-4">
          <CurrencyNote settings={settings} />
        </div>
      </section>
    </main>
  );
}
