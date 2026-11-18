import { Info } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { RegistrySettings } from "@/lib/types";

export function PriceNotice({ settings, compact }: { settings: RegistrySettings; compact?: boolean }) {
  const text =
    settings.price_notice ||
    `Prices were recorded${settings.prices_recorded_on ? ` on ${formatDate(settings.prices_recorded_on)}` : ""} and may have changed. Please double-check before buying.`;
  return (
    <div className={`flex gap-3 rounded-2xl border border-beige/70 bg-cream/70 text-sm text-ink-soft ${compact ? "p-3" : "p-4"}`} role="note" data-testid="price-notice">
      <Info className="mt-0.5 size-4 shrink-0 text-taupe" aria-hidden />
      <p>{text}</p>
    </div>
  );
}

export function CurrencyNote() {
  return (
    <p className="text-xs text-muted" data-testid="currency-note">
      Prices are in Ugandan shillings (UGX), as listed by Peekaboo Uganda.
    </p>
  );
}
