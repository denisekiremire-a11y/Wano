"use client";

import { useOptimistic, useTransition } from "react";
import { toggleFollowAction } from "@/lib/actions/social-actions";

export function FollowButton({
  targetTravellerId,
  initialFollowing,
  compact = false,
}: {
  targetTravellerId: string;
  initialFollowing: boolean;
  /** Smaller padding/text for narrow contexts (e.g. a horizontal-scroll
   * rail) — same behavior, just sized down. */
  compact?: boolean;
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
      className={`flex-none rounded-full font-semibold transition ${compact ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm"} ${
        following
          ? "border border-forest-800/20 text-forest-800 hover:bg-forest-800/5"
          : "bg-forest-800 text-white hover:bg-forest-700"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
