"use client";

import { useState } from "react";

export function ShareReferralBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const link = typeof window !== "undefined" ? `${window.location.origin}/join?ref=${code}` : `/join?ref=${code}`;

  async function copy(value: string, which: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard access can be denied — the text is still visible to copy manually.
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on Wano",
          text: `Join me on Wano and we both get rewarded — use my code ${code}`,
          url: link,
        });
      } catch {
        // User cancelled the share sheet — nothing to do.
      }
    } else {
      copy(link, "link");
    }
  }

  return (
    <section className="rounded-2xl border border-forest-900/10 bg-white p-5">
      <h3 className="font-display text-lg font-semibold text-forest-900">Refer a friend</h3>
      <p className="mt-1 text-sm text-forest-800/60">
        Earn 150 pts once someone who joins with your code confirms their first booking.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <p className="inline-block rounded-lg bg-forest-50 px-3 py-1.5 font-mono text-sm font-semibold text-forest-900">
          {code}
        </p>
        <button
          type="button"
          onClick={() => copy(code, "code")}
          className="rounded-full bg-forest-100 px-3 py-1.5 text-xs font-semibold text-forest-800 transition hover:bg-forest-200"
        >
          {copied === "code" ? "Copied" : "Copy code"}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p className="truncate text-xs text-forest-800/60">{link}</p>
        <button
          type="button"
          onClick={() => copy(link, "link")}
          className="shrink-0 rounded-full bg-forest-100 px-3 py-1.5 text-xs font-semibold text-forest-800 transition hover:bg-forest-200"
        >
          {copied === "link" ? "Copied" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={share}
          className="shrink-0 rounded-full bg-marigold-500 px-3 py-1.5 text-xs font-semibold text-forest-950 transition hover:bg-marigold-400"
        >
          Share
        </button>
      </div>
    </section>
  );
}
