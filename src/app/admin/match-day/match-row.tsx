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
    <div className="space-y-3 rounded-2xl border border-forest-900/10 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-forest-900">{title}</p>
          <p className="text-xs text-forest-800/60">
            {location} · {new Date(startAt).toLocaleString()}
          </p>
        </div>
        <span className="rounded-full bg-forest-100 px-3 py-1 text-xs font-semibold text-forest-800">
          {seatsTaken}/{WANO_XP_SEAT_CAP} seats
        </span>
      </div>

      {alreadyDrawn ? (
        <p className="text-sm text-forest-800/70">
          Drawn: <span className="font-semibold text-forest-900">{drawWinnerName}</span> won{" "}
          {drawPrizeTitle}.
        </p>
      ) : confirmedCount === 0 ? (
        <p className="text-xs text-forest-800/50">No confirmed bookings yet — nothing to draw from.</p>
      ) : prizeOptions.length === 0 ? (
        <p className="text-xs text-forest-800/50">
          Add an active reward with source &quot;XP draw&quot; in /admin/rewards first.
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <select
            value={prizeId}
            onChange={(e) => setPrizeId(e.target.value)}
            className="rounded-lg border border-forest-900/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest-600"
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
            className="rounded-full bg-marigold-500 px-4 py-2 text-sm font-semibold text-forest-950 transition hover:bg-marigold-400 disabled:opacity-60"
          >
            {pending ? "Drawing…" : `Draw winner (1 in ${confirmedCount})`}
          </button>
        </div>
      )}
      {result?.error && <p className="text-xs text-red-700">{result.error}</p>}
      {result?.winnerName && <p className="text-xs text-forest-700">{result.winnerName} won!</p>}
    </div>
  );
}
