"use client";

import { useState } from "react";

/** One button everywhere a page should be shareable — tries the native
 * share sheet first (covers WhatsApp, Messages, etc. on a phone that
 * supports it), and falls back to explicit "Copy link"/"Share to
 * WhatsApp" actions on browsers without navigator.share (most desktop
 * ones). Appends the signed-in traveller's referral code to the link
 * when given one, so a share that leads to a signup gets attributed
 * automatically — same ?ref= param /join already reads
 * (see share-referral-block.tsx, the existing precedent this mirrors). */
export function ShareButton({
  title,
  path,
  text,
  referralCode,
}: {
  title: string;
  path: string;
  text?: string;
  referralCode?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  function buildUrl() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    if (!referralCode) return `${origin}${path}`;
    const sep = path.includes("?") ? "&" : "?";
    return `${origin}${path}${sep}ref=${referralCode}`;
  }

  async function nativeShare() {
    const url = buildUrl();
    try {
      await navigator.share({ title, text, url });
    } catch {
      // User cancelled the share sheet — nothing to do.
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(buildUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail without permission — nothing else to do here.
    }
  }

  function shareToWhatsApp() {
    const url = buildUrl();
    const message = text ? `${text} ${url}` : url;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  if (typeof navigator !== "undefined" && "share" in navigator) {
    return (
      <button
        type="button"
        onClick={nativeShare}
        className="rounded-full border border-forest-900/15 px-5 py-2.5 text-sm font-semibold text-forest-800 transition hover:bg-forest-900/5"
      >
        Share
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={copyLink}
        className="rounded-full border border-forest-900/15 px-4 py-2 text-sm font-semibold text-forest-800 transition hover:bg-forest-900/5"
      >
        {copied ? "Link copied!" : "Copy link"}
      </button>
      <button
        type="button"
        onClick={shareToWhatsApp}
        className="rounded-full bg-marigold-500 px-4 py-2 text-sm font-semibold text-forest-950 transition hover:bg-marigold-400"
      >
        Share to WhatsApp
      </button>
    </div>
  );
}
