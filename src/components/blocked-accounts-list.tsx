"use client";

import { useState, useTransition } from "react";
import { unblockUserAction } from "@/lib/actions/moderation-actions";

type BlockedEntry = {
  traveller: { id: string; displayName: string };
  user: { username: string | null };
  blockedAt: Date;
};

export function BlockedAccountsList({ blockedList }: { blockedList: BlockedEntry[] }) {
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const visible = blockedList.filter((b) => !removed.has(b.traveller.id));

  if (visible.length === 0) {
    return <p className="text-sm text-forest-800/60">You haven&apos;t blocked anyone.</p>;
  }

  return (
    <div className="space-y-2">
      {visible.map(({ traveller, user }) => (
        <div key={traveller.id} className="flex items-center justify-between rounded-lg border border-forest-900/10 p-3">
          <div>
            <p className="text-sm font-medium text-forest-900">{traveller.displayName}</p>
            {user.username && <p className="text-xs text-forest-800/50">@{user.username}</p>}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await unblockUserAction(traveller.id);
                setRemoved((prev) => new Set(prev).add(traveller.id));
              })
            }
            className="rounded-full border border-forest-900/15 px-3 py-1 text-xs font-semibold text-forest-800 hover:bg-forest-50 disabled:opacity-50"
          >
            Unblock
          </button>
        </div>
      ))}
    </div>
  );
}
