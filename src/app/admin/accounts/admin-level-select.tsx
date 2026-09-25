"use client";

import { useState, useTransition } from "react";
import { setAdminLevelAction } from "@/lib/actions/admin-account-actions";
import type { AdminLevel } from "@/lib/admin-permissions";

const LEVELS: AdminLevel[] = ["support", "ops", "super"];

export function AdminLevelSelect({ userId, level, isSelf }: { userId: string; level: AdminLevel; isSelf: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        defaultValue={level}
        disabled={pending || isSelf}
        title={isSelf ? "You can't change your own level here — ask another super admin." : undefined}
        onChange={(e) => {
          const next = e.target.value as AdminLevel;
          startTransition(async () => {
            setError(null);
            const result = await setAdminLevelAction(userId, next);
            if (result.error) setError(result.error);
          });
        }}
        className="rounded-lg border border-forest-900/15 bg-white px-2 py-1 text-xs text-forest-800 capitalize disabled:opacity-50"
      >
        {LEVELS.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
      {error && <p className="text-[11px] text-red-700">{error}</p>}
    </div>
  );
}
