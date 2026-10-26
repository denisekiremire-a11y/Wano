"use client";

import { useTransition } from "react";
import { endEventSeriesAction } from "@/lib/actions/event-actions";

export function EndSeriesButton({ seriesId }: { seriesId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Stop this weekly event? All future dates will be hidden.")) return;
        startTransition(() => endEventSeriesAction(seriesId));
      }}
      className="flex-none rounded-full border border-ink/20 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-ink/5 disabled:opacity-60"
    >
      {pending ? "Stopping…" : "Stop weekly"}
    </button>
  );
}
