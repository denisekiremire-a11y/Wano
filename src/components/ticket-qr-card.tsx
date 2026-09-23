"use client";

import { useEffect, useRef, useState } from "react";
import { generateTicketQrAction } from "@/lib/actions/ticket-actions";

const QR_REFRESH_MS = 90_000;

/** The ticket/pass card on a booking confirmation page — always shows the
 * QR (unlike voucher-card.tsx's collapsed-by-default reward card, this is
 * the confirmation page's primary content, not a wallet list item). Same
 * refresh-while-mounted pattern: a screenshot of the code goes stale in
 * under two minutes. */
export function TicketQrCard({ bookingId, title, bookingRef }: { bookingId: string; title: string; bookingRef: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function refreshQr() {
      const result = await generateTicketQrAction(bookingId);
      if (!cancelled) setQrDataUrl(result.qrDataUrl);
    }
    refreshQr();
    intervalRef.current = setInterval(refreshQr, QR_REFRESH_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [bookingId]);

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-forest-900/10 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-forest-800/50">Your ticket</p>
      <p className="text-center text-sm font-semibold text-forest-900">{title}</p>
      {qrDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- data: URI, not an optimizable remote image
        <img src={qrDataUrl} alt="Ticket QR code" className="h-48 w-48" />
      ) : (
        <div className="flex h-48 w-48 items-center justify-center rounded-lg bg-forest-50 text-xs text-forest-800/50">
          Loading…
        </div>
      )}
      <p className="text-[11px] text-forest-800/50">
        Show this at the door. If the scan fails, staff can enter your confirmation code (
        <span className="font-mono">{bookingRef}</span>) manually.
      </p>
    </div>
  );
}
