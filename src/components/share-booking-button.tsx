"use client";

import { useState } from "react";

export function ShareBookingButton({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User cancelled the share sheet, or it's unsupported — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail without permission — nothing else to do here.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="rounded-full border border-forest-900/15 px-5 py-2.5 text-sm font-semibold text-forest-800 transition hover:bg-forest-900/5"
    >
      {copied ? "Link copied!" : "Share"}
    </button>
  );
}
