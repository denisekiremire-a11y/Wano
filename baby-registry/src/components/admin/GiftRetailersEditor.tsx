"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { removeGiftRetailerAction, saveGiftRetailerAction, type ActionResult } from "@/app/actions/admin";
import type { GiftRetailer, Retailer } from "@/lib/types";

export function GiftRetailersEditor({ giftId, links, retailers }: { giftId: string; links: GiftRetailer[]; retailers: Retailer[] }) {
  const [flash, setFlash] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const name = new Map(retailers.map((r) => [r.id, r.name]));

  return (
    <section className="card space-y-4 p-5" aria-labelledby="links-heading">
      <div>
        <h2 id="links-heading" className="text-2xl">
          Where to buy
        </h2>
        <p className="text-sm text-muted">
          Add a direct product link only once you’ve checked it. Without one, guests see clearly labelled search links. Physical stores are
          managed per shop on the <a className="underline" href="/admin/retailers">Shops</a> page.
        </p>
      </div>
      {links.length > 0 ? (
        <ul className="divide-y divide-linen rounded-2xl border border-linen bg-white">
          {links.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">
                  {name.get(l.retailer_id)} {l.is_primary && <span className="text-xs text-muted">(primary)</span>}
                </p>
                {l.product_url ? (
                  <a href={l.product_url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-xs text-sage-700 hover:underline">
                    <ExternalLink className="size-3" aria-hidden /> {l.product_url}
                  </a>
                ) : (
                  <p className="text-xs text-muted">No product link — guests see a search link</p>
                )}
                {l.source_note && <p className="text-xs text-muted">{l.source_note}</p>}
              </div>
              <button
                type="button"
                className="btn-danger px-3 py-1.5 text-xs"
                disabled={pending}
                onClick={() => start(async () => setFlash(await removeGiftRetailerAction(l.id)))}
                aria-label={`Remove ${name.get(l.retailer_id)}`}
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No shops linked yet.</p>
      )}

      <form
        className="grid gap-3 rounded-2xl bg-cream/50 p-4 md:grid-cols-2"
        action={(fd) => start(async () => setFlash(await saveGiftRetailerAction(giftId, fd)))}
        data-testid="link-form"
      >
        <p className="text-sm font-medium md:col-span-2">Add or update a shop for this gift</p>
        <select name="retailerId" className="field-input" required aria-label="Shop">
          {retailers.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <input name="productUrl" className="field-input" placeholder="https://… direct product page (optional)" aria-label="Product URL" />
        <input name="sourceNote" className="field-input md:col-span-2" placeholder="Note, e.g. “Seen in store at Dubai Mall”" maxLength={300} aria-label="Note" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="urlVerified" className="size-4 accent-[var(--color-sage-700)]" /> I’ve checked this link works
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isPrimary" className="size-4 accent-[var(--color-sage-700)]" /> Primary shop
        </label>
        <div className="md:col-span-2">
          <button type="submit" className="btn-primary text-xs" disabled={pending}>
            <Plus className="size-4" aria-hidden /> Save shop link
          </button>
        </div>
      </form>
      {flash && (
        <p className={`text-sm ${flash.ok ? "text-sage-700" : "text-rose-700"}`} role="status">
          {flash.message}
        </p>
      )}
    </section>
  );
}
