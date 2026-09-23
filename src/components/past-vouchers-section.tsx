"use client";

import { useState } from "react";

type PastVoucherRow = {
  id: string;
  title: string;
  targetTitle: string;
  statusLabel: "Used" | "Expired";
  detail: string | null;
};

/** Used + expired vouchers merged into one collapsed toggle — cuts
 * vertical sprawl for a wallet with real history while "Active" stays
 * the always-visible primary content of the Rewards tab. */
export function PastVouchersSection({ rows }: { rows: PastVoucherRow[] }) {
  const [open, setOpen] = useState(false);
  if (rows.length === 0) return null;

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-forest-900/10 bg-white p-3 text-left"
      >
        <span className="font-display text-sm font-semibold text-forest-900">Past vouchers ({rows.length})</span>
        <span className="text-xs font-medium text-nile-700">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className={`flex items-center justify-between rounded-xl border border-forest-900/10 bg-white p-3 ${
                row.statusLabel === "Expired" ? "opacity-60" : ""
              }`}
            >
              <div>
                <p className="text-sm font-medium text-forest-900">{row.title}</p>
                <p className="text-xs text-forest-800/50">
                  {row.targetTitle}
                  {row.detail ? ` · ${row.detail}` : ""}
                </p>
              </div>
              <span
                className={`flex-none rounded-full px-3 py-1 text-xs font-semibold ${
                  row.statusLabel === "Used" ? "bg-forest-800 text-white" : "bg-forest-100 text-forest-800"
                }`}
              >
                {row.statusLabel}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
