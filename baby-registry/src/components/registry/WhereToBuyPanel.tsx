import { ExternalLink, MapPin, Phone, Search, ShieldCheck, Store } from "lucide-react";
import { buildWhereToBuy } from "@/lib/links";
import type { Gift, GiftRetailer, Retailer, StoreLocation } from "@/lib/types";

interface Props {
  gift: Pick<Gift, "id" | "name">;
  giftRetailers: GiftRetailer[];
  retailers: Retailer[];
  locations: StoreLocation[];
}

export function WhereToBuyPanel({ gift, giftRetailers, retailers, locations }: Props) {
  const w = buildWhereToBuy(gift, giftRetailers, retailers, locations);
  return (
    <div className="space-y-6" data-testid="where-to-buy">
      {w.sources.length > 0 && (
        <div className="rounded-2xl bg-cream/70 p-4 text-sm text-ink-soft">
          <p className="eyebrow mb-1.5">From the original list</p>
          <ul className="space-y-1">
            {w.sources.map((s) => (
              <li key={s.retailer}>
                <span className="font-medium text-ink">{s.retailer}</span>
                {s.note ? ` — ${s.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section>
        <h3 className="mb-3 flex items-center gap-2 font-sans text-sm font-semibold uppercase tracking-wider text-taupe">
          <ExternalLink className="size-4" aria-hidden /> Shop online
        </h3>
        <ul className="space-y-2">
          {w.online.map((o) => (
            <li key={o.href}>
              <a
                href={o.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-2xl border border-linen bg-white px-4 py-3 transition-colors hover:border-sand"
              >
                <span>
                  <span className="block font-medium text-ink">{o.label}</span>
                  {o.note && <span className="block text-xs text-muted">{o.note}</span>}
                </span>
                {o.kind === "search" ? (
                  <Search className="size-4 shrink-0 text-taupe" aria-hidden />
                ) : (
                  <ExternalLink className="size-4 shrink-0 text-taupe" aria-hidden />
                )}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-3 flex items-center gap-2 font-sans text-sm font-semibold uppercase tracking-wider text-taupe">
          <Store className="size-4" aria-hidden /> Buy in store
        </h3>
        <ul className="space-y-2">
          {w.physical.map((p) => (
            <li key={p.href + p.label} className="rounded-2xl border border-linen bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{p.label}</p>
                  {p.kind === "location" && (
                    <div className="mt-1 space-y-0.5 text-sm text-ink-soft">
                      {p.area && <p>{p.area}</p>}
                      {p.address && <p>{p.address}</p>}
                      {p.phone && (
                        <p>
                          <a className="inline-flex items-center gap-1 underline-offset-2 hover:underline" href={`tel:${p.phone.replace(/[^0-9+]/g, "")}`}>
                            <Phone className="size-3.5" aria-hidden /> {p.phone}
                          </a>
                        </p>
                      )}
                      {p.verified && (
                        <p className="inline-flex items-center gap-1 text-xs text-sage-700">
                          <ShieldCheck className="size-3.5" aria-hidden /> Verified by the family
                        </p>
                      )}
                    </div>
                  )}
                  {p.kind === "search" && <p className="text-xs text-muted">Google Maps search — store details not yet verified</p>}
                </div>
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary shrink-0 px-3.5 py-2 text-xs"
                  aria-label={`${p.kind === "location" ? "Directions to" : "Search maps for"} ${p.label}`}
                >
                  <MapPin className="size-3.5" aria-hidden /> {p.kind === "location" ? "Directions" : "Maps"}
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-muted">
        Links open in a new tab. Search links are generated automatically and are not a guarantee of stock or price.
      </p>
    </div>
  );
}
