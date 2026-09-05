"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startConversationAction } from "@/lib/actions/message-actions";

export function MessageButton({ targetTravellerId }: { targetTravellerId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await startConversationAction(targetTravellerId);
            if ("error" in result) setError(result.error);
            else router.push(`/messages/${result.conversationId}`);
          })
        }
        className="flex-none rounded-full border border-forest-800/20 px-4 py-2 text-sm font-semibold text-forest-800 transition hover:bg-forest-800/5 disabled:opacity-60"
      >
        Message
      </button>
      {error && <p className="absolute top-full mt-1 w-max text-xs text-red-700">{error}</p>}
    </div>
  );
}
