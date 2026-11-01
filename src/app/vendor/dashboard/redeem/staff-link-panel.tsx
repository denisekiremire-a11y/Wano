"use client";

import { useState, useTransition } from "react";
import { rotateStaffLinkAction } from "@/lib/actions/staff-actions";

export function StaffLinkPanel({ staffUrl }: { staffUrl: string | null }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function rotate() {
    if (staffUrl && !confirm("Rotating kills the current staff link immediately — anyone with it bookmarked will need the new one. Continue?")) {
      return;
    }
    startTransition(async () => {
      await rotateStaffLinkAction();
    });
  }

  async function copy() {
    if (!staffUrl) return;
    try {
      await navigator.clipboard.writeText(staffUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied (e.g. no HTTPS, browser permission) —
      // the link is still shown as selectable text either way.
    }
  }

  return (
    <div className="space-y-3">
      {staffUrl ? (
        <div className="flex flex-wrap items-center gap-3">
          <code className="font-mono-data break-all rounded-lg border border-ink/15 bg-ink/5 px-3 py-2 text-xs text-ink">
            {staffUrl}
          </code>
          <button
            type="button"
            onClick={copy}
            className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-ink/30"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : (
        <p className="text-sm text-ink/60">No staff link yet — generate one to share with waiters.</p>
      )}
      <button
        type="button"
        onClick={rotate}
        disabled={pending}
        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/85 disabled:opacity-60"
      >
        {pending ? "Working…" : staffUrl ? "Rotate (revoke old link)" : "Generate staff link"}
      </button>
    </div>
  );
}
