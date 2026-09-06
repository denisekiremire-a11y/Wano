"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { cancelXpBookingAction, createXpBookingAction } from "@/lib/actions/xp-actions";
import { WANO_XP_PRICE_PER_SEAT_UGX, WANO_XP_REFUND_CUTOFF_HOURS } from "@/lib/xp-config";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

type XpBooking = { id: string; seats: number; amountUgx: number; status: "pending" | "confirmed" | "cancelled" | "refunded" };

export function XpBookingPanel({
  matchId,
  matchStartAt,
  seatsRemaining,
  myBookings,
}: {
  matchId: string;
  matchStartAt: string;
  seatsRemaining: number;
  myBookings: XpBooking[];
}) {
  const [state, formAction, pending] = useActionState(createXpBookingAction, initialState);
  const [seats, setSeats] = useState(1);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelPending, startCancel] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const soldOut = seatsRemaining <= 0;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const hoursUntilKickoff = (new Date(matchStartAt).getTime() - now) / (60 * 60 * 1000);
  const cancelAllowed = hoursUntilKickoff >= WANO_XP_REFUND_CUTOFF_HOURS;

  const activeBookings = myBookings.filter((b) => b.status === "confirmed");

  function handleCancel(bookingId: string) {
    setCancelError(null);
    startCancel(async () => {
      const result = await cancelXpBookingAction(bookingId);
      if (result.error) setCancelError(result.error);
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-nile-900/15 bg-gradient-to-br from-nile-900 to-forest-900 p-5 text-white">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Wano XP</p>
        <p className="mt-1 text-2xl font-display font-bold">
          UGX {WANO_XP_PRICE_PER_SEAT_UGX.toLocaleString()} <span className="text-sm font-normal text-white/70">/ seat</span>
        </p>
        <p className="mt-1 text-sm text-white/80">
          {soldOut ? "Sold out" : `${seatsRemaining} seat${seatsRemaining === 1 ? "" : "s"} left`} · every
          confirmed seat is an automatic entry into the match-day prize draw.
        </p>
      </div>

      {activeBookings.length > 0 && (
        <div className="space-y-2 rounded-xl bg-white/10 p-3">
          {activeBookings.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 text-sm">
              <span>
                {b.seats} seat{b.seats === 1 ? "" : "s"} · UGX {b.amountUgx.toLocaleString()}
              </span>
              <button
                type="button"
                disabled={cancelPending || !cancelAllowed}
                title={cancelAllowed ? undefined : `Refunds close ${WANO_XP_REFUND_CUTOFF_HOURS}h before kick-off`}
                onClick={() => handleCancel(b.id)}
                className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {cancelAllowed ? "Cancel" : "Too late to cancel"}
              </button>
            </div>
          ))}
          {cancelError && <p className="text-xs text-marigold-200">{cancelError}</p>}
        </div>
      )}

      {!soldOut && (
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="matchId" value={matchId} />
          <div>
            <label className="text-xs font-medium text-white/70">Seats</label>
            <input
              name="seats"
              type="number"
              min={1}
              max={seatsRemaining}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
              className="mt-1 w-20 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-marigold-500 px-4 py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-marigold-400 disabled:opacity-60"
          >
            {pending ? "Booking…" : `Book · UGX ${(seats * WANO_XP_PRICE_PER_SEAT_UGX).toLocaleString()}`}
          </button>
        </form>
      )}
      {state.error && <p className="text-sm text-marigold-200">{state.error}</p>}
      <p className="text-[11px] text-white/50">Payment is a demo step for now — no card is charged.</p>
    </div>
  );
}
