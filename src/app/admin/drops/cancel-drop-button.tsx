"use client";

import { useTransition } from "react";
import { cancelDropAction } from "@/lib/actions/drop-actions";

export function CancelDropButton({ dropId }: { dropId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Cancel this Drop? Any vouchers already claimed will be voided.")) return;
        startTransition(() => cancelDropAction(dropId));
      }}
      className="flex-none rounded-full border border-ink/20 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-ink/5 disabled:opacity-60"
    >
      {pending ? "Cancelling…" : "Cancel"}
    </button>
  );
}
