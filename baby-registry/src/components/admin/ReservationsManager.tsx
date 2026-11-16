"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { Check, ChevronDown, Download, RotateCcw, Search, X } from "lucide-react";
import { closeReservationAction, markReservationPurchasedAction, type ActionResult } from "@/app/actions/admin";
import { normalise } from "@/lib/filters";
import { formatAED } from "@/lib/currency";
import { formatDateTime } from "@/lib/format";
import type { Reservation, ReservationEvent, ReservationStatus } from "@/lib/types";

const STATUS_STYLE: Record<ReservationStatus, string> = {
  active: "bg-blush text-clay-dark",
  purchased: "bg-sage-50 text-sage-700",
  cancelled: "bg-linen text-muted",
  released: "bg-linen text-muted",
  expired: "bg-linen text-muted",
};

type Filter = "all" | ReservationStatus;

export function ReservationsManager({ reservations, events }: { reservations: Reservation[]; events: ReservationEvent[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [flash, setFlash] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  const rows = useMemo(() => {
    const terms = normalise(q.trim()).split(/\s+/).filter(Boolean);
    return reservations.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (!terms.length) return true;
      const hay = normalise([r.guest_name, r.guest_email, r.guest_phone, r.reference, r.gift_name_snapshot, r.message].filter(Boolean).join(" "));
      return terms.every((t) => hay.includes(t));
    });
  }, [reservations, q, status]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: reservations.length };
    for (const r of reservations) m[r.status] = (m[r.status] ?? 0) + 1;
    return m;
  }, [reservations]);

  const run = (fn: () => Promise<ActionResult>, confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    start(async () => setFlash(await fn()));
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-col gap-3 p-4 md:flex-row md:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search reservations</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input className="field-input pl-10" placeholder="Search by guest, email, phone, gift or reference…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="res-search" />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {(["all", "active", "purchased", "cancelled", "released", "expired"] as Filter[]).map((s) => (
            <button key={s} type="button" className={status === s ? "chip-on" : "chip-off"} onClick={() => setStatus(s)}>
              {s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)} <span className="opacity-70">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>
        <a download href="/admin/export/reservations" className="btn-secondary text-xs">
          <Download className="size-3.5" aria-hidden /> CSV
        </a>
      </div>

      {flash && (
        <p className={`rounded-xl p-3 text-sm ${flash.ok ? "bg-sage-50 text-sage-800" : "bg-rose-50 text-rose-700"}`} role="status" data-testid="flash">
          {flash.ok ? flash.message : flash.message}
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="admin-table min-w-[900px]" data-testid="reservations-table">
          <thead>
            <tr>
              <th>Guest</th>
              <th>Gift</th>
              <th>Reserved</th>
              <th>Reference</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-muted">
                  {reservations.length === 0 ? "No reservations yet. They’ll appear here the moment a guest reserves a gift." : "No reservations match."}
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const history = events.filter((e) => e.reservation_id === r.id);
              const isOpen = open === r.id;
              return (
                <Fragment key={r.id}>
                  <tr data-testid="reservation-row" data-reference={r.reference}>
                    <td>
                      <p className="font-medium">{r.guest_name}</p>
                      {r.guest_email && (
                        <a href={`mailto:${r.guest_email}`} className="block text-xs text-muted hover:underline">
                          {r.guest_email}
                        </a>
                      )}
                      {r.guest_phone && (
                        <a href={`tel:${r.guest_phone.replace(/[^0-9+]/g, "")}`} className="block text-xs text-muted hover:underline">
                          {r.guest_phone}
                        </a>
                      )}
                    </td>
                    <td>
                      <p>{r.gift_name_snapshot}</p>
                      <p className="text-xs text-muted">{formatAED(r.price_aed_snapshot)}</p>
                    </td>
                    <td className="whitespace-nowrap text-xs">{formatDateTime(r.created_at)}</td>
                    <td className="font-mono text-xs">{r.reference}</td>
                    <td>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[r.status]}`} data-testid="reservation-status">
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {r.status === "active" && (
                          <button
                            type="button"
                            className="btn-secondary px-3 py-1.5 text-xs"
                            disabled={pending}
                            onClick={() => run(() => markReservationPurchasedAction(r.id), `Mark “${r.gift_name_snapshot}” as purchased by ${r.guest_name}?`)}
                            data-testid="mark-purchased"
                          >
                            <Check className="size-3.5" aria-hidden /> Purchased
                          </button>
                        )}
                        {(r.status === "active" || r.status === "purchased") && (
                          <>
                            <button
                              type="button"
                              className="btn-secondary px-3 py-1.5 text-xs"
                              disabled={pending}
                              onClick={() =>
                                run(() => closeReservationAction(r.id, "released"), `Release “${r.gift_name_snapshot}” back to AVAILABLE? Other guests will be able to reserve it.`)
                              }
                              data-testid="release"
                            >
                              <RotateCcw className="size-3.5" aria-hidden /> Release
                            </button>
                            <button
                              type="button"
                              className="btn-danger px-3 py-1.5 text-xs"
                              disabled={pending}
                              onClick={() =>
                                run(() => closeReservationAction(r.id, "cancelled"), `Cancel ${r.guest_name}’s reservation? The gift becomes available again.`)
                              }
                              data-testid="cancel"
                            >
                              <X className="size-3.5" aria-hidden /> Cancel
                            </button>
                          </>
                        )}
                        <button type="button" className="btn-ghost px-2 py-1.5 text-xs" onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen}>
                          History <ChevronDown className={`size-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={6} className="bg-cream/40">
                        {r.message && (
                          <p className="mb-2 text-sm">
                            <span className="text-muted">Message:</span> “{r.message}”
                          </p>
                        )}
                        {r.admin_note && (
                          <p className="mb-2 text-sm">
                            <span className="text-muted">Note:</span> {r.admin_note}
                          </p>
                        )}
                        <ol className="space-y-1 text-xs">
                          {history.length === 0 && <li className="text-muted">No history recorded.</li>}
                          {[...history].reverse().map((e) => (
                            <li key={e.id}>
                              <span className="text-muted">{formatDateTime(e.created_at)}</span> — <strong>{e.event}</strong> by {e.actor}
                              {e.details ? ` (${e.details})` : ""}
                            </li>
                          ))}
                        </ol>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
