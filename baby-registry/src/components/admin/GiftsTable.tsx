"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteGiftAction, setGiftStatusAction, type ActionResult } from "@/app/actions/admin";
import { GiftImage } from "@/components/registry/GiftImage";
import { priceView } from "@/lib/pricing";
import { normalise } from "@/lib/filters";
import type { Category, Gift, GiftStatus } from "@/lib/types";

export function GiftsTable({ gifts, categories }: { gifts: Gift[]; categories: Category[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<number | "all">("all");
  const [flash, setFlash] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  const rows = useMemo(() => {
    const t = normalise(q.trim());
    return gifts.filter((g) => (cat === "all" || g.category_id === cat) && (!t || normalise(`${g.name} ${g.description ?? ""} ${g.slug}`).includes(t)));
  }, [gifts, q, cat]);

  const changeStatus = (g: Gift, s: GiftStatus) => {
    const msg =
      s === "available"
        ? `Make “${g.name}” available again? Any reservation on it will be released.`
        : s === "purchased"
          ? `Mark “${g.name}” as purchased?`
          : `Mark “${g.name}” as reserved?`;
    if (!window.confirm(msg)) return;
    start(async () => setFlash(await setGiftStatusAction(g.id, s)));
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-col gap-3 p-4 md:flex-row md:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search gifts</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input className="field-input pl-10" placeholder="Search gifts…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <select className="field-input w-auto" value={cat} onChange={(e) => setCat(e.target.value === "all" ? "all" : Number(e.target.value))} aria-label="Category">
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <a download href="/admin/export/gifts" className="btn-secondary text-xs">
          <Download className="size-3.5" aria-hidden /> CSV
        </a>
        <Link href="/admin/gifts/new" className="btn-primary text-xs">
          <Plus className="size-4" aria-hidden /> Add gift
        </Link>
      </div>
      {flash && (
        <p className={`rounded-xl p-3 text-sm ${flash.ok ? "bg-sage-50 text-sage-800" : "bg-rose-50 text-rose-700"}`} role="status" data-testid="flash">
          {flash.message}
        </p>
      )}
      <p className="text-sm text-muted">{rows.length} gifts</p>
      <div className="card overflow-x-auto">
        <table className="admin-table min-w-[860px]">
          <thead>
            <tr>
              <th className="w-14" />
              <th>Gift</th>
              <th>Category</th>
              <th>Price</th>
              <th>Availability</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.id} data-testid="admin-gift-row" data-slug={g.slug}>
                <td>
                  <div className="relative size-12 overflow-hidden rounded-lg">
                    <GiftImage gift={g} sizes="48px" showKindTag={false} />
                  </div>
                </td>
                <td>
                  <Link href={`/admin/gifts/${g.id}`} className="font-medium hover:underline">
                    {g.name}
                  </Link>
                  <p className="text-xs text-muted">
                    {[g.is_featured && "Featured", g.is_alternative && "Alternative", g.tier !== "standard" && g.tier].filter(Boolean).join(" · ")}
                  </p>
                </td>
                <td className="text-sm">{catName.get(g.category_id)}</td>
                <td className="whitespace-nowrap text-sm">
                  {priceView(g, null).aed}
                  <p className="text-xs text-muted">{g.price_label}</p>
                </td>
                <td>
                  <select
                    className="field-input w-auto py-1.5 text-sm"
                    value={g.status}
                    disabled={pending}
                    onChange={(e) => changeStatus(g, e.target.value as GiftStatus)}
                    aria-label={`Availability of ${g.name}`}
                    data-testid="status-select"
                  >
                    <option value="available">Available</option>
                    <option value="reserved" disabled={g.status === "available"}>
                      Reserved
                    </option>
                    <option value="purchased">Purchased</option>
                  </select>
                </td>
                <td>
                  <div className="flex justify-end gap-1.5">
                    <Link href={`/admin/gifts/${g.id}`} className="btn-secondary px-3 py-1.5 text-xs">
                      <Pencil className="size-3.5" aria-hidden /> Edit
                    </Link>
                    <button
                      type="button"
                      className="btn-danger px-3 py-1.5 text-xs"
                      disabled={pending}
                      onClick={() => {
                        if (!window.confirm(`Delete “${g.name}” permanently? Reservation history is kept.`)) return;
                        start(async () => setFlash(await deleteGiftAction(g.id)));
                      }}
                      aria-label={`Delete ${g.name}`}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
