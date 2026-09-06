"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { withdrawListingSubmissionAction } from "@/lib/actions/vendor-listing-actions";
import { withdrawRewardSubmissionAction } from "@/lib/actions/reward-actions";

export function WithdrawSubmissionButton({
  submissionId,
  kind,
}: {
  submissionId: string;
  kind: "listing" | "reward";
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleWithdraw() {
    if (!window.confirm("Withdraw this submission?")) return;
    startTransition(async () => {
      if (kind === "listing") await withdrawListingSubmissionAction(submissionId);
      else await withdrawRewardSubmissionAction(submissionId);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleWithdraw}
      className="text-xs font-medium text-marigold-900/70 underline hover:text-marigold-900 disabled:opacity-50"
    >
      Withdraw
    </button>
  );
}
