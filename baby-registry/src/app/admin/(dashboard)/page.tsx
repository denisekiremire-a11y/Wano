import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { StatusBadge } from "@/components/registry/StatusBadge";
import { requireAdmin } from "@/lib/admin";
import { loadAdminCore, loadEvents, loadReservations } from "@/lib/admin-data";
import { formatAED, formatUGX } from "@/lib/currency";
import { formatDateTime } from "@/lib/format";
import { countSince, liveTotals, statusCounts } from "@/lib/totals";

export const metadata: Metadata = { title: "Overview" };

const EVENT_LABEL: Record<string, string> = {
  reserved: "Reserved",
  purchased: "Marked purchased",
  cancelled: "Reservation cancelled",
  released: "Released to available",
  expired: "Expired automatically",
};

export default async function AdminOverview() {
  const { supabase } = await requireAdmin();
  const [{ gifts, categories, settings }, reservations, events] = await Promise.all([
    loadAdminCore(supabase),
    loadReservations(supabase),
    loadEvents(supabase, 25),
  ]);
  const c = statusCounts(gifts);
  const t = liveTotals(gifts, categories);
  const rate = settings.aed_to_ugx_rate;
  const giftName = new Map(gifts.map((g) => [g.id, g.name]));
  const resById = new Map(reservations.map((r) => [r.id, r]));
  const active = reservations.filter((r) => r.status === "active");
  const today = countSince(reservations, 86_400_000);

  const tiles = [
    { label: "Total gifts", value: c.total, id: "total" },
    { label: "Available", value: c.available, id: "available" },
    { label: "Reserved", value: c.reserved, id: "reserved" },
    { label: "Purchased", value: c.purchased, id: "purchased" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl">Overview</h1>
          <p className="text-sm text-muted">{c.percentClaimed}% of the list has been reserved or purchased.</p>
        </div>
        <div className="flex gap-2">
          <a download href="/admin/export/reservations" className="btn-secondary text-xs">
            <Download className="size-3.5" aria-hidden /> Reservations CSV
          </a>
          <a download href="/admin/export/gifts" className="btn-secondary text-xs">
            <Download className="size-3.5" aria-hidden /> Gifts CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((x) => (
          <div key={x.id} className="card p-5">
            <p className="text-xs text-muted">{x.label}</p>
            <p className="mt-1 font-display text-4xl" data-testid={`admin-stat-${x.id}`}>
              {x.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <p className="eyebrow">Estimated wishlist value</p>
          <p className="mt-2 font-display text-3xl">{formatAED(t.allExcludingAlternatives)}</p>
          {rate ? <p className="text-sm text-muted">≈ {formatUGX(t.allExcludingAlternatives, rate)}</p> : null}
          <p className="mt-2 text-xs text-muted">
            All gifts except alternatives, at sale price / listed price / middle of range. Including alternatives: {formatAED(t.everything)}.
            {t.unpricedItems ? ` ${t.unpricedItems} gift(s) have no price.` : ""}
          </p>
        </div>
        <div className="card p-5">
          <p className="eyebrow">Reserved & purchased value</p>
          <p className="mt-2 font-display text-3xl">{formatAED(t.reservedValue + t.purchasedValue)}</p>
          <p className="mt-2 text-xs text-muted">
            Reserved {formatAED(t.reservedValue)} · Purchased {formatAED(t.purchasedValue)}
          </p>
        </div>
        <div className="card p-5">
          <p className="eyebrow">Original document estimates</p>
          <p className="mt-2 text-sm">
            Budget <strong>~AED {settings.doc_budget_total_aed?.toLocaleString("en-US")}</strong> · Full{" "}
            <strong>~AED {settings.doc_full_total_aed?.toLocaleString("en-US")}</strong>
          </p>
          <p className="mt-1 text-sm">
            Live: budget {formatAED(t.budget)} · full {formatAED(t.full)}
          </p>
        </div>
      </div>

      {!rate && (
        <div className="rounded-2xl border border-clay/30 bg-blush/60 p-4 text-sm text-clay-dark">
          No AED → UGX exchange rate is set, so guests only see AED prices.{" "}
          <Link href="/admin/settings" className="font-medium underline">
            Set the rate
          </Link>
          .
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-2xl">Waiting to be purchased</h2>
            <Link href="/admin/reservations" className="text-sm text-sage-700 hover:underline">
              All reservations <ArrowRight className="inline size-3.5" aria-hidden />
            </Link>
          </div>
          {active.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No active reservations yet.</p>
          ) : (
            <ul className="divide-y divide-linen">
              {active.slice(0, 10).map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.gift_name_snapshot}</p>
                    <p className="truncate text-muted">
                      {r.guest_name} · {formatDateTime(r.created_at)}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-muted">{r.reference}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-1 text-2xl">Reservation activity</h2>
          <p className="mb-3 text-xs text-muted">{today} new in the last 24 hours</p>
          {events.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Nothing yet.</p>
          ) : (
            <ol className="space-y-3 text-sm" data-testid="activity">
              {events.map((e) => {
                const r = e.reservation_id ? resById.get(e.reservation_id) : undefined;
                const name = (e.gift_id && giftName.get(e.gift_id)) || r?.gift_name_snapshot || "A gift";
                const label = EVENT_LABEL[e.event] ?? (e.event.startsWith("status_set:") ? `Status set to ${e.event.split(":")[1]}` : e.event);
                return (
                  <li key={e.id} className="flex gap-3">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-sage-400" />
                    <div>
                      <p>
                        <span className="font-medium">{label}</span> — {name}
                      </p>
                      <p className="text-xs text-muted">
                        {e.actor === "guest" ? (e.details ?? "Guest") : e.actor === "admin" ? "By admin" : "System"} · {formatDateTime(e.created_at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <section className="card overflow-x-auto p-5">
        <h2 className="mb-3 text-2xl">By category</h2>
        <table className="admin-table min-w-[560px]">
          <thead>
            <tr>
              <th>Category</th>
              <th>Gifts</th>
              <th>Status</th>
              <th className="text-right">Value (excl. alternatives)</th>
            </tr>
          </thead>
          <tbody>
            {t.byCategory.map((row) => {
              const gs = gifts.filter((g) => g.category_id === row.category.id);
              const cc = statusCounts(gs);
              return (
                <tr key={row.category.id}>
                  <td className="font-medium">{row.category.name}</td>
                  <td>{row.items}</td>
                  <td className="space-x-1.5">
                    <StatusBadge status="available" /> {cc.available} <StatusBadge status="reserved" /> {cc.reserved}{" "}
                    <StatusBadge status="purchased" /> {cc.purchased}
                  </td>
                  <td className="text-right tabular-nums">{formatAED(row.liveAllExcludingAlternatives)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
