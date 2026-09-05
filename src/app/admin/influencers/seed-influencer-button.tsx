"use client";

import { useState, useTransition } from "react";
import { runDemoInfluencerBackfillAction } from "@/lib/actions/admin-seed-actions";

export function SeedInfluencerButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof runDemoInfluencerBackfillAction>> | null>(null);

  return (
    <div className="rounded-2xl border border-dashed border-forest-900/20 bg-white p-4">
      <p className="text-sm text-forest-800/70">
        Want to see this working without waiting for a real account to grow? Seed one demo
        influencer with 1,000 followers and three posts at 300 / 500 / 800 likes.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setResult(await runDemoInfluencerBackfillAction()))}
        className="mt-3 rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-700 disabled:opacity-60"
      >
        {pending ? "Seeding…" : "Seed demo influencer"}
      </button>
      {result && (
        <p className="mt-2 text-xs text-forest-800/60">
          {result.accountCreated ? "Created" : "Already existed"} @{result.username} · {result.postsCreated} new
          post{result.postsCreated === 1 ? "" : "s"} added.
        </p>
      )}
    </div>
  );
}
