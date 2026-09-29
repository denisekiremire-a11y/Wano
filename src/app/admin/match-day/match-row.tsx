"use client";

import { useState, useTransition } from "react";
import { runXpDrawAction } from "@/lib/actions/xp-actions";
import { WANO_XP_SEAT_CAP } from "@/lib/xp-config";

type PrizeOption = { id: string; title: string; targetTitle: string };

export function MatchRow({
  title,
  location,
  startAt,
  seatsTaken,
  confirmedCount,
  pendingCount,
  drawWinnerName,
  drawPrizeTitle,
  prizeOptions,
  matchId,
}: {
  title: string;
  location: string;
  startAt: string;
  seatsTaken: number;
  confirmedCount: number;
  pendingCount: number;
  drawWinnerName: string | null;
  drawPrizeTitle: string | null;
  prizeOptions: PrizeOption[];
  matchId: string;
}) {
  const [prizeId, setPrizeId] = useState(prizeOptions[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ error?: string; winnerName?: string } | null>(null);

  const alreadyDrawn = Boolean(drawWinnerName);

  function draw() {
    if (!prizeId) return;
    startTransition(async () => {
      const res = await runXpDrawAction(matchId, prizeId);
      setResult(res);
    });
  }

  return (
    <div className="space-y-3 border border-ink/10 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="text-xs text-ink/50">
            {location} · {new Date(startAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-none flex-col items-end gap-1">
          <span className="font-mono-data text-xs text-ink/50">
            {seatsTaken}/{WANO_XP_SEAT_CAP} seats
          </span>
          {pendingCount > 0 && (
            <span className="eyebrow text-ember">{pendingCount} awaiting payment</span>
          )}
        </div>
      </div>

      {alreadyDrawn ? (
        <p className="text-sm text-ink/60">
          Drawn: <span className="font-semibold text-ink">{drawWinnerName}</span> won{" "}
          {drawPrizeTitle}.
        </p>
      ) : confirmedCount === 0 ? (
        <p className="text-xs text-ink/40">No confirmed bookings yet — nothing to draw from.</p>
      ) : prizeOptions.length === 0 ? (
        <p className="text-xs text-ink/40">
          Add an active reward with source &quot;XP draw&quot; in /admin/rewards first.
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <select
            value={prizeId}
            onChange={(e) => setPrizeId(e.target.value)}
            className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-ember"
          >
            {prizeOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.targetTitle})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={draw}
            disabled={pending}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
          >
            {pending ? "Drawing…" : `Draw winner (1 in ${confirmedCount})`}
          </button>
        </div>
      )}
      {result?.error && <p className="text-xs text-red-700">{result.error}</p>}
      {result?.winnerName && <p className="text-xs text-ink">{result.winnerName} won!</p>}
    </div>
  );
}
