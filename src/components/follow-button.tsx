"use client";

import { useOptimistic, useTransition } from "react";
import { toggleFollowAction } from "@/lib/actions/social-actions";

export function FollowButton({
  targetTravellerId,
  initialFollowing,
}: {
  targetTravellerId: string;
  initialFollowing: boolean;
}) {
  const [following, setOptimisticFollowing] = useOptimistic(initialFollowing);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          setOptimisticFollowing(!following);
          await toggleFollowAction(targetTravellerId);
        })
      }
      className={`flex-none rounded-full px-4 py-2 text-sm font-semibold transition ${
        following
          ? "border border-forest-800/20 text-forest-800 hover:bg-forest-800/5"
          : "bg-forest-800 text-white hover:bg-forest-700"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
