"use client";

import { useState, useTransition } from "react";
import { setAccreditationStatusAction } from "@/lib/actions/admin-actions";

export function AccreditationPanel({
  vendorProfileId,
  status,
}: {
  vendorProfileId: string;
  status: "trusted" | "pending" | "rejected";
}) {
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  const decide = (next: "trusted" | "rejected" | "pending") => {
    startTransition(async () => {
      await setAccreditationStatusAction(vendorProfileId, next, notes);
      setNotes("");
    });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-forest-900/10 bg-white p-5">
      <h2 className="font-display text-lg font-semibold text-forest-900">Accreditation decision</h2>
      <p className="text-sm text-forest-800/60">Current status: <span className="font-medium">{status}</span></p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional note for the record (e.g. why rejected, what's outstanding)"
        rows={2}
        className="w-full rounded-lg border border-forest-900/15 px-3 py-2 text-sm outline-none focus:border-forest-600"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || status === "trusted"}
          onClick={() => decide("trusted")}
          className="rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Approve as Wano Verified
        </button>
        <button
          type="button"
          disabled={pending || status === "rejected"}
          onClick={() => decide("rejected")}
          className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
        >
          Reject
        </button>
        <button
          type="button"
          disabled={pending || status === "pending"}
          onClick={() => decide("pending")}
          className="rounded-full border border-forest-900/20 px-4 py-2 text-sm font-semibold text-forest-800 disabled:opacity-50"
        >
          Move back to pending
        </button>
      </div>
    </div>
  );
}
