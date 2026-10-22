"use client";

import { useEffect, useRef, useState } from "react";
import { generateVisitorQrAction } from "@/lib/actions/reward-actions";

const QR_REFRESH_MS = 90_000;

/** "Your Wano QR" — a traveller's personal, always-on QR (distinct from
 * any one voucher's QR). Venue staff scan it from the vendor dashboard to
 * see this traveller's claimable rewards at that venue. Same
 * refresh-while-open pattern as VoucherCard, just always expanded since
 * it has nothing to collapse behind. */
export function VisitorQrCard() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function refreshQr() {
      const result = await generateVisitorQrAction();
      if (!cancelled) setQrDataUrl(result.qrDataUrl);
    }
    refreshQr();
    intervalRef.current = setInterval(refreshQr, QR_REFRESH_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="border border-ink/10 bg-white p-5 text-center">
      <p className="eyebrow text-ink/40">Your Wano QR</p>
      <p className="mt-1 text-sm text-ink/60">Show this at the venue — staff scan it to see what you can claim.</p>
      <div className="mt-4 flex justify-center">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data: URI, not an optimizable remote image
          <img src={qrDataUrl} alt="Your Wano QR code" className="h-48 w-48" />
        ) : (
          <div className="flex h-48 w-48 items-center justify-center rounded-lg bg-ink/5 text-xs text-ink/50">
            Loading…
          </div>
        )}
      </div>
    </div>
  );
}
