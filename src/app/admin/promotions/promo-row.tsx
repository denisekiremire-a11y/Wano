"use client";

import { useTransition } from "react";
import { togglePromoCodeAction } from "@/lib/actions/promo-actions";

export function PromoRow({
  promoId,
  code,
  title,
  discountText,
  freebieText,
  scopeLabel,
  active,
}: {
  promoId: string;
  code: string;
  title: string;
  discountText: string;
  freebieText: string | null;
  scopeLabel: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between border border-ink/10 bg-white p-4">
      <div>
        <p className="font-mono-data text-sm font-semibold text-ink">{code}</p>
        <p className="text-sm text-ink/80">{title}</p>
        <p className="text-xs text-ink/60">
          {discountText}
          {freebieText ? ` + ${freebieText}` : ""}
        </p>
        <p className="text-[11px] text-ink/40">{scopeLabel}</p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => togglePromoCodeAction(promoId, !active))}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
          active ? "border border-ink/20 text-ink hover:bg-ink/5" : "bg-ink text-white hover:bg-ink/85"
        }`}
      >
        {active ? "Active — deactivate" : "Inactive — activate"}
      </button>
    </div>
  );
}
