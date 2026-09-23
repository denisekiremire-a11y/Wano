"use client";

import { useState, useTransition } from "react";
import { lookupTicketByRefForVendor, type TicketCheck } from "@/lib/actions/ticket-actions";
import { TicketCheckInPanel } from "./ticket-checkin-panel";

export function LookupTicketByRef() {
  const [ref, setRef] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ check: TicketCheck; bookingId?: string } | null>(null);

  function lookup() {
    if (!ref.trim()) return;
    startTransition(async () => {
      const check = await lookupTicketByRefForVendor(ref);
      setResult({ check, bookingId: check.bookingId });
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <div>
          <label className="text-sm font-medium text-forest-900">Confirmation code</label>
          <input
            value={ref}
            onChange={(e) => {
              setRef(e.target.value);
              setResult(null);
            }}
            placeholder="e.g. PAM-AB12CD"
            className="mt-1 w-40 rounded-lg border border-forest-900/15 px-3 py-2 text-sm uppercase outline-none focus:border-forest-600"
          />
        </div>
        <button
          type="button"
          onClick={lookup}
          disabled={pending || !ref.trim()}
          className="rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
        >
          {pending ? "Looking up…" : "Look up"}
        </button>
      </div>
      {result && <TicketCheckInPanel check={result.check} bookingId={result.bookingId} />}
    </div>
  );
}
