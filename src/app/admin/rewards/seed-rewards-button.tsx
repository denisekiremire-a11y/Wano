"use client";

import { useState, useTransition } from "react";
import { runDemoRewardsBackfillAction } from "@/lib/actions/admin-seed-actions";

export function SeedRewardsButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof runDemoRewardsBackfillAction>> | null>(null);

  return (
    <div className="rounded-2xl border border-dashed border-forest-900/20 bg-white p-4">
      <p className="text-sm text-forest-800/70">
        One-click setup for the two launch Match Day prizes: a Fun Zone win (20% off at Le
        Chateau Brasserie) and the XP draw grand prize (two nights in Jinja + a Bujagali Falls
        excursion).
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setResult(await runDemoRewardsBackfillAction()))}
        className="mt-3 rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
      >
        {pending ? "Seeding…" : "Seed launch prizes"}
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
