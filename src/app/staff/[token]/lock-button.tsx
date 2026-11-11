"use client";

import { useTransition } from "react";
import { lockStaffSessionAction } from "@/lib/actions/staff-actions";

export function LockButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => lockStaffSessionAction())}
      className="eyebrow text-ink/40 hover:text-ink disabled:opacity-60"
    >
      {pending ? "Locking…" : "Lock"}
    </button>
  );
}
