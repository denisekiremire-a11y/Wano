"use client";

import { useState, useTransition } from "react";
import { runDemoInventoryBackfillAction } from "@/lib/actions/admin-seed-actions";

export function BackfillButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof runDemoInventoryBackfillAction>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              const r = await runDemoInventoryBackfillAction();
              setResult(r);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Something went wrong.");
            }
          })
        }
        className="rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
      >
        {pending ? "Running…" : "Run demo inventory backfill"}
      </button>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {result && (
        <div className="rounded-xl border border-forest-900/10 bg-white p-4 text-sm text-forest-800/80">
          <p className="font-medium text-forest-900">Done.</p>
          <ul className="mt-2 space-y-1">
            <li>Demo partners created: {result.vendorsCreated}</li>
            <li>Listings created: {result.listingsCreated}</li>
            <li>Events created: {result.eventsCreated}</li>
            <li>Clubs created: {result.clubsCreated}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
