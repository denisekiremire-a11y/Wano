"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { detachListingFromTrailAction } from "@/lib/actions/trail-actions";

export function DetachListingButton({ trailListingId }: { trailListingId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (!window.confirm("Remove this listing from the trail?")) return;
          await detachListingFromTrailAction(trailListingId);
          router.refresh();
        })
      }
      className="text-xs font-medium text-ink/40 hover:text-red-700 disabled:opacity-60"
    >
      Remove
    </button>
  );
}
