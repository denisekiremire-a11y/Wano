"use client";

import { useState, useTransition } from "react";
import { runAfconVenueVendorsSeedAction } from "@/lib/actions/admin-seed-actions";

export function SeedVenueVendorsButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof runAfconVenueVendorsSeedAction>> | null>(null);

  return (
    <div className="rounded-2xl border border-dashed border-forest-900/20 bg-white p-4">
      <p className="text-sm text-forest-800/70">
        One-click demo vendors for the AFCON venue pages — a hotel, restaurant, activity, and
        transport partner near both Namboole and Hoima, with real coordinates so the distance
        sorting on /afcon/namboole and /afcon/hoima has something to show.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setResult(await runAfconVenueVendorsSeedAction()))}
        className="mt-3 rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
      >
        {pending ? "Seeding…" : "Seed AFCON venue vendors"}
      </button>
      {result && (
        <ul className="mt-2 space-y-0.5 text-xs text-forest-800/60">
          {result.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
