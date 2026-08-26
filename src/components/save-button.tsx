"use client";

import { useOptimistic, useTransition } from "react";
import { HeartIcon } from "@/components/icons";
import { toggleSavedListingAction } from "@/lib/actions/saved-listing-actions";

export function SaveButton({
  listingId,
  initialSaved,
}: {
  listingId: string;
  initialSaved: boolean;
}) {
  const [saved, setOptimisticSaved] = useOptimistic(initialSaved);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={saved ? "Remove from saved places" : "Save this place"}
      onClick={() =>
        startTransition(async () => {
          setOptimisticSaved(!saved);
          await toggleSavedListingAction(listingId);
        })
      }
      className={`flex-none rounded-full p-1.5 transition ${
        saved ? "text-red-500" : "text-forest-800/30 hover:text-forest-800/60"
      }`}
    >
      <HeartIcon className="h-5 w-5" filled={saved} />
    </button>
  );
}
