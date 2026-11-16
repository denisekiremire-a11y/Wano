"use client";

import { useActionState, useState, useTransition } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { deleteLocationAction, deleteRetailerAction, saveLocationAction, saveRetailerAction, type ActionResult } from "@/app/actions/admin";
import type { Retailer, StoreLocation } from "@/lib/types";

function Msg({ s }: { s: ActionResult | null }) {
  if (!s) return null;
  return <p className={`text-sm ${s.ok ? "text-sage-700" : "text-rose-700"}`}>{s.message}</p>;
}

function RetailerForm({ retailer }: { retailer?: Retailer }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveRetailerAction, null);
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      {retailer && <input type="hidden" name="id" value={retailer.id} />}
      <input name="name" required maxLength={120} defaultValue={retailer?.name} placeholder="Shop name" className="field-input" aria-label="Shop name" />
      <input name="websiteUrl" defaultValue={retailer?.website_url ?? ""} placeholder="https://… (verified website)" className="field-input" aria-label="Website" />
      <input name="phone" maxLength={40} defaultValue={retailer?.phone ?? ""} placeholder="Phone (verified)" className="field-input" aria-label="Phone" />
      <input name="notes" maxLength={1000} defaultValue={retailer?.notes ?? ""} placeholder="Notes" className="field-input" aria-label="Notes" />
      <div className="flex items-center gap-3 md:col-span-2">
        <button type="submit" className="btn-primary text-xs" disabled={pending}>
          {retailer ? "Save shop" : (
            <>
              <Plus className="size-4" aria-hidden /> Add shop
            </>
          )}
        </button>
        <Msg s={state} />
      </div>
    </form>
  );
}

function LocationForm({ retailerId, location }: { retailerId: number; location?: StoreLocation }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveLocationAction, null);
  return (
    <form action={action} className="grid gap-2 md:grid-cols-3">
      <input type="hidden" name="retailerId" value={retailerId} />
      {location && <input type="hidden" name="id" value={location.id} />}
      <input name="name" required maxLength={160} defaultValue={location?.name} placeholder="Store name, e.g. Mom Store – Dubai Mall" className="field-input md:col-span-2" aria-label="Store name" />
      <input name="area" maxLength={160} defaultValue={location?.area ?? ""} placeholder="Area / mall" className="field-input" aria-label="Area" />
      <input name="address" maxLength={400} defaultValue={location?.address ?? ""} placeholder="Address (verified)" className="field-input md:col-span-2" aria-label="Address" />
      <input name="phone" maxLength={40} defaultValue={location?.phone ?? ""} placeholder="Phone (verified)" className="field-input" aria-label="Phone" />
      <input name="mapsUrl" defaultValue={location?.maps_url ?? ""} placeholder="Google Maps link https://…" className="field-input md:col-span-2" aria-label="Maps link" />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="verified" defaultChecked={location?.verified} className="size-4 accent-[var(--color-sage-700)]" /> Details verified
      </label>
      <div className="flex items-center gap-3 md:col-span-3">
        <button type="submit" className="btn-secondary text-xs" disabled={pending}>
          {location ? "Save store" : "Add store"}
        </button>
        <Msg s={state} />
      </div>
    </form>
  );
}

export function RetailersManager({ retailers, locations, linkCounts }: { retailers: Retailer[]; locations: StoreLocation[]; linkCounts: Record<number, number> }) {
  const [flash, setFlash] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-6">
      {flash && <Msg s={flash} />}
      {retailers.map((r) => (
        <section key={r.id} className="card space-y-4 p-5" data-testid="retailer">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl">{r.name}</h2>
              <p className="text-xs text-muted">Linked to {linkCounts[r.id] ?? 0} gifts</p>
            </div>
            <button
              type="button"
              className="btn-danger px-3 py-1.5 text-xs"
              disabled={pending}
              onClick={() => {
                if (window.confirm(`Delete ${r.name}? Its links on gifts and its stores will be removed.`)) start(async () => setFlash(await deleteRetailerAction(r.id)));
              }}
              aria-label={`Delete ${r.name}`}
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </div>
          <RetailerForm retailer={r} />
          <div className="space-y-3 border-t border-linen pt-4">
            <h3 className="flex items-center gap-1.5 font-sans text-sm font-semibold">
              <MapPin className="size-4" aria-hidden /> Physical stores
            </h3>
            {locations
              .filter((l) => l.retailer_id === r.id)
              .map((l) => (
                <div key={l.id} className="rounded-2xl bg-cream/40 p-3">
                  <LocationForm retailerId={r.id} location={l} />
                  <button type="button" className="mt-2 text-xs text-rose-700 hover:underline" disabled={pending} onClick={() => start(async () => setFlash(await deleteLocationAction(l.id)))}>
                    Remove store
                  </button>
                </div>
              ))}
            {locations.every((l) => l.retailer_id !== r.id) && (
              <p className="text-xs text-muted">No stores yet — guests see a Google Maps search for “{r.name} Dubai”.</p>
            )}
            <details>
              <summary className="cursor-pointer text-sm text-sage-700">Add a store</summary>
              <div className="mt-3">
                <LocationForm retailerId={r.id} />
              </div>
            </details>
          </div>
        </section>
      ))}
      <section className="card space-y-3 p-5">
        <h2 className="text-2xl">Add a shop</h2>
        <RetailerForm />
      </section>
    </div>
  );
}
