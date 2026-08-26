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
    <div className="flex items-center justify-between rounded-2xl border border-forest-900/10 bg-white p-4">
      <div>
        <p className="font-mono text-sm font-semibold text-forest-900">{code}</p>
        <p className="text-sm text-forest-800/80">{title}</p>
        <p className="text-xs text-forest-800/60">
          {discountText}
          {freebieText ? ` + ${freebieText}` : ""}
        </p>
        <p className="text-[11px] text-forest-800/45">{scopeLabel}</p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => togglePromoCodeAction(promoId, !active))}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
          active ? "bg-forest-100 text-forest-800" : "bg-forest-800 text-white"
        }`}
      >
        {active ? "Active — deactivate" : "Inactive — activate"}
      </button>
    </div>
  );
}
