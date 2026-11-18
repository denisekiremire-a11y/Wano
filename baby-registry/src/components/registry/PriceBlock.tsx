import { BASIS_LABEL, priceView } from "@/lib/pricing";
import type { Gift } from "@/lib/types";

interface Props {
  gift: Gift;
  /** No longer used (UGX only); kept so callers needn't change. */
  rate?: number | null;
  size?: "sm" | "lg";
  showBasis?: boolean;
}

export function PriceBlock({ gift, size = "sm", showBasis = true }: Props) {
  const v = priceView(gift);
  const big = size === "lg";
  return (
    <div className="space-y-0.5">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className={`font-semibold text-ink ${big ? "text-2xl" : "text-[17px]"}`} data-testid="price-aed">
          {v.isRange && <span className="sr-only">Estimated range </span>}
          {v.aed}
        </span>
        {v.wasAed && <span className={`text-muted line-through ${big ? "text-base" : "text-sm"}`}>{v.wasAed}</span>}
        {v.unit && <span className="text-sm text-muted">{v.unit}</span>}
      </div>
      {v.ugx && (
        <div className={`text-muted ${big ? "text-base" : "text-[13px]"}`} data-testid="price-ugx">
          ≈ {v.ugx}
        </div>
      )}
      {showBasis && v.hasPrice && (
        <div className="text-xs text-taupe">
          {v.isSale ? "Sale · " : ""}
          {BASIS_LABEL[v.basis]}
          {v.isRange ? " range" : ""}
        </div>
      )}
    </div>
  );
}
