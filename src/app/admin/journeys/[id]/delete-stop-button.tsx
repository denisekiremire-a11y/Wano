"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteStopAction } from "@/lib/actions/journey-actions";

export function DeleteStopButton({ journeyId, stopId }: { journeyId: string; stopId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (!window.confirm("Remove this stop?")) return;
          await deleteStopAction(journeyId, stopId);
          router.refresh();
        })
      }
      className="text-xs font-medium text-forest-800/50 hover:text-red-700 disabled:opacity-60"
    >
      Remove
    </button>
  );
}
