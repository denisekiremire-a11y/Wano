"use client";

import { useEffect, useRef, useState } from "react";
import { generateRewardQrAction } from "@/lib/actions/reward-actions";

const QR_REFRESH_MS = 90_000;

function formatCountdown(ms: number) {
  if (ms <= 0) return "Expired";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days}d left`;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 1) return `${hours}h left`;
  const minutes = Math.floor(ms / (60 * 1000));
  return `${minutes}m left`;
}

export function VoucherCard({
  userRewardId,
  title,
  discountLabel,
  redemptionCode,
  expiresAt,
  targetHref,
  targetTitle,
  isXpPrize,
}: {
  userRewardId: string;
  title: string;
  discountLabel: string;
  redemptionCode: string;
  expiresAt: string;
  targetHref?: string;
  targetTitle?: string;
  isXpPrize?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const expiresAtMs = new Date(expiresAt).getTime();

  useEffect(() => {
    const clockId = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(clockId);
  }, []);

  useEffect(() => {
    if (!expanded) return;

    let cancelled = false;
    async function refreshQr() {
      const result = await generateRewardQrAction(userRewardId);
      if (!cancelled) setQrDataUrl(result.qrDataUrl);
    }
    refreshQr();
    intervalRef.current = setInterval(refreshQr, QR_REFRESH_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [expanded, userRewardId]);

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isXpPrize ? "border-marigold-400 bg-marigold-50" : "border-forest-900/10 bg-white"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          {isXpPrize && (
            <span className="mb-1 inline-block rounded-full bg-marigold-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-forest-950">
              XP Prize
            </span>
          )}
          <p className="text-sm font-semibold text-forest-900">{title}</p>
          <p className="text-xs text-forest-800/60">
            {discountLabel}
            {targetTitle ? ` · ${targetTitle}` : ""}
          </p>
          <p className="text-[11px] text-forest-800/45">{formatCountdown(expiresAtMs - now)}</p>
        </div>
        <span className="flex-none text-xs font-semibold text-nile-700">{expanded ? "Hide" : "Show QR"}</span>
      </button>

      {expanded && (
        <div className="mt-4 flex flex-col items-center gap-2 border-t border-forest-900/5 pt-4">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data: URI, not an optimizable remote image
            <img src={qrDataUrl} alt="Redemption QR code" className="h-48 w-48" />
          ) : (
            <div className="flex h-48 w-48 items-center justify-center rounded-lg bg-forest-50 text-xs text-forest-800/50">
              Loading…
            </div>
          )}
          <p className="font-mono text-sm font-semibold tracking-wider text-forest-900">{redemptionCode}</p>
          <p className="text-[11px] text-forest-800/50">
            If the scan fails, staff can enter this code manually — still needs their venue PIN.
          </p>
          {targetHref && (
            <a href={targetHref} className="mt-1 text-xs font-medium text-nile-700 hover:underline">
              View {targetTitle ?? "place"}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
