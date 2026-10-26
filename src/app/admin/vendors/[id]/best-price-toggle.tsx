"use client";

import { useTransition } from "react";
import { setBestPriceOnWanoAction } from "@/lib/actions/admin-actions";

export function BestPriceToggle({ vendorProfileId, value }: { vendorProfileId: string; value: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input
        type="checkbox"
        checked={value}
        disabled={pending}
        onChange={(e) => startTransition(() => setBestPriceOnWanoAction(vendorProfileId, e.target.checked))}
        className="h-4 w-4 rounded border-ink/30"
      />
      Best Price on Wano — badges this vendor&apos;s listings and ranks them slightly higher
    </label>
  );
}
