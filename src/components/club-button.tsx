"use client";

import { useOptimistic, useTransition } from "react";
import { toggleClubMembershipAction } from "@/lib/actions/social-actions";

export function ClubButton({
  clubKey,
  initialJoined,
}: {
  clubKey: string;
  initialJoined: boolean;
}) {
  const [joined, setOptimisticJoined] = useOptimistic(initialJoined);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        startTransition(async () => {
          setOptimisticJoined(!joined);
          await toggleClubMembershipAction(clubKey);
        });
      }}
      className={`flex-none rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        joined
          ? "border border-forest-800/20 text-forest-800 hover:bg-forest-800/5"
          : "bg-forest-800 text-white hover:bg-forest-700"
      }`}
    >
      {joined ? "Joined" : "Join"}
    </button>
  );
}
