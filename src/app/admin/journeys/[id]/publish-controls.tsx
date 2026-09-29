"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishJourneyAction, unpublishJourneyAction } from "@/lib/actions/journey-actions";

export function PublishControls({ journeyId, status }: { journeyId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      {status !== "published" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await publishJourneyAction(journeyId);
              if (result?.error) setError(result.error);
              else router.refresh();
            })
          }
          className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
        >
          {pending ? "Publishing…" : "Publish"}
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await unpublishJourneyAction(journeyId);
              router.refresh();
            })
          }
          className="rounded-full border border-ink/20 px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-ink/5 disabled:opacity-60"
        >
          {pending ? "Unlisting…" : "Unlist"}
        </button>
      )}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
