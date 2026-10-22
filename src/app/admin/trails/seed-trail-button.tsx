"use client";

import { useState, useTransition } from "react";
import { runWano40TrailSeedAction } from "@/lib/actions/admin-seed-actions";

export function SeedTrailButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Awaited<ReturnType<typeof runWano40TrailSeedAction>> | null>(null);

  return (
    <div className="border border-dashed border-ink/20 bg-white p-4">
      <p className="text-sm text-ink/70">
        One-click setup for the launch trail, &ldquo;Wano 40 Discoveries&rdquo; — no listings attached
        yet; add them below once it&apos;s created.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setResult(await runWano40TrailSeedAction()))}
        className="mt-3 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Seeding…" : "Seed Wano 40 Discoveries"}
      </button>
      {result && (
        <ul className="mt-2 space-y-0.5 text-xs text-ink/60">
          {result.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
