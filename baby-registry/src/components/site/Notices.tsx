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

export function CurrencyNote({ settings }: { settings: RegistrySettings }) {
  const rate = settings.aed_to_ugx_rate;
  if (!rate || rate <= 0) {
    return (
      <p className="text-xs text-muted" data-testid="currency-note">
        Prices are shown in UAE dirhams (AED), the currency of the original list. Ugandan shilling (UGX) amounts will appear once the
        family sets an exchange rate.
      </p>
    );
  }
  return (
    <p className="text-xs text-muted" data-testid="currency-note">
      AED prices are the original reference prices. UGX amounts are approximate, converted at 1 AED ≈{" "}
      {new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(rate)} UGX
      {settings.rate_updated_at ? ` (rate set ${formatDate(settings.rate_updated_at)})` : ""}.
    </p>
  );
}
