"use client";

import { useActionState, useState } from "react";
import { reviewPriceMatchReportAction } from "@/lib/actions/price-match-actions";
import type { ActionState } from "@/lib/validation";

const initialState: ActionState = {};

export function PriceMatchRow({
  reportId,
  bookingRef,
  travellerName,
  travellerEmail,
  details,
  createdAt,
}: {
  reportId: string;
  bookingRef: string;
  travellerName: string;
  travellerEmail: string;
  details: string;
  createdAt: Date;
}) {
  const [state, formAction, pending] = useActionState(reviewPriceMatchReportAction, initialState);
  const [deciding, setDeciding] = useState<"credit" | "decline" | null>(null);
  const resolved = !state.error && state !== initialState;

  if (resolved) {
    return (
      <div className="border border-ink/10 bg-white p-4 opacity-60">
        <p className="text-sm text-ink">Reviewed — {bookingRef}</p>
      </div>
    );
  }

  return (
    <div className="border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono-data text-sm font-semibold text-ink">{bookingRef}</p>
          <p className="text-xs text-ink/60">
            {travellerName} · {travellerEmail}
          </p>
          <p className="mt-2 text-sm text-ink">{details}</p>
          <p className="mt-1 text-[11px] text-ink/40">Reported {createdAt.toLocaleString()}</p>
        </div>
        <div className="flex-none">
          {!deciding ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeciding("credit")}
                className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Credit
              </button>
              <button
                type="button"
                onClick={() => setDeciding("decline")}
                className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                Decline
              </button>
            </div>
          ) : (
            <form action={formAction} className="flex items-center gap-2">
              <input type="hidden" name="reportId" value={reportId} />
              <input type="hidden" name="decision" value={deciding} />
              {deciding === "credit" && (
                <input
                  name="creditedPoints"
                  type="number"
                  min={1}
                  required
                  placeholder="Points"
                  className="w-20 rounded-lg border border-ink/15 px-2 py-1.5 text-xs outline-none focus:border-ember"
                />
              )}
              <button
                type="submit"
                disabled={pending}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 ${
                  deciding === "credit" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {pending ? "Saving…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setDeciding(null)}
                className="text-xs text-ink/50 hover:text-ink"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
      {state.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
    </div>
  );
}
