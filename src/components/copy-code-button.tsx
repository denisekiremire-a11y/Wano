"use client";

import { useState } from "react";

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail without permission; the code is shown as text either way.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-full border border-forest-900/15 px-3 py-1.5 text-xs font-semibold text-forest-800 transition hover:bg-forest-900/5"
    >
      {copied ? "Copied!" : "Copy code"}
    </button>
  );
}
