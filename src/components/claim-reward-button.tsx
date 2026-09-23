"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast/toast-provider";
import { claimRewardAction } from "@/lib/actions/reward-actions";

export function ClaimRewardButton({
  rewardId,
  title,
  discountLabel,
}: {
  rewardId: string;
  title: string;
  discountLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { push } = useToast();

  function doClaim() {
    const formData = new FormData();
    formData.set("rewardId", rewardId);
    startTransition(async () => {
      // Called directly (not via useActionState's form-submit lifecycle) so
      // the toast still fires even though a successful claim moves this
      // reward out of the "claimable" list and unmounts this very button
      // as part of the same revalidatePath — a useEffect keyed to this
      // component's own pending state would lose that race.
      const result = await claimRewardAction({}, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        push("Reward claimed — check your wallet.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmDialog
        title="Claim this reward?"
        body={
          <>
            <p className="font-medium text-forest-900">{title}</p>
            <p>{discountLabel}</p>
            <p className="mt-2">It&apos;ll be waiting in your Passport wallet.</p>
          </>
        }
        confirmLabel="Claim"
        onConfirm={doClaim}
        trigger={(open) => (
          <button
            type="button"
            onClick={open}
            disabled={pending}
            className="rounded-full bg-marigold-500 px-3 py-1.5 text-xs font-semibold text-forest-950 transition hover:bg-marigold-400 disabled:opacity-60"
          >
            {pending ? "Claiming…" : "Claim"}
          </button>
        )}
      />
      {error && <p className="text-[11px] text-red-700">{error}</p>}
    </div>
  );
}
