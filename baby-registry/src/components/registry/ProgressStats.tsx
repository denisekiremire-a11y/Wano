"use client";

import { statusCounts } from "@/lib/totals";
import { useRegistry } from "./context";
import { LiveIndicator } from "./LiveIndicator";

export function ProgressStats() {
  const { gifts } = useRegistry();
  const c = statusCounts(gifts);
  const items = [
    { label: "Gifts on the list", value: c.total, testid: "stat-total" },
    { label: "Still available", value: c.available, testid: "stat-available" },
    { label: "Reserved", value: c.reserved, testid: "stat-reserved" },
    { label: "Purchased", value: c.purchased, testid: "stat-purchased" },
  ];
  return (
    <section aria-labelledby="progress-heading" className="card p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Wishlist progress</p>
          <h2 id="progress-heading" className="mt-1 text-2xl sm:text-3xl">
            {c.percentClaimed}% of gifts have been chosen
          </h2>
        </div>
        <LiveIndicator />
      </div>
      <div
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-linen"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={c.percentClaimed}
        aria-label="Share of gifts reserved or purchased"
      >
        <div className="flex h-full">
          <div className="h-full bg-sage-600 transition-[width] duration-700" style={{ width: `${c.total ? (c.purchased / c.total) * 100 : 0}%` }} />
          <div className="h-full bg-sage-400 transition-[width] duration-700" style={{ width: `${c.total ? (c.reserved / c.total) * 100 : 0}%` }} />
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="rounded-2xl bg-cream/60 px-4 py-3">
            <dt className="text-xs text-muted">{i.label}</dt>
            <dd className="mt-0.5 font-display text-3xl text-ink" data-testid={i.testid}>
              {i.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
