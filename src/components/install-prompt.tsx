"use client";

import { useEffect, useState } from "react";

const DISMISSED_KEY = "wano_install_dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's own flag — not covered by the display-mode media query.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Already installed, or the user dismissed the prompt before — both are
// derivable synchronously from client-only globals, so computing them as
// lazy initial state (guarded for SSR) avoids ever needing to setState
// synchronously inside an effect body for this.
function computeInitialDismissed() {
  if (typeof window === "undefined") return true;
  if (isStandalone()) return true;
  try {
    return Boolean(localStorage.getItem(DISMISSED_KEY));
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSBanner] = useState(() => !computeInitialDismissed() && isIOS());
  const [dismissed, setDismissed] = useState(computeInitialDismissed);

  useEffect(() => {
    if (dismissed || showIOSBanner) return;

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, [dismissed, showIOSBanner]);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Nothing to do if storage is unavailable — it'll just show again next visit.
    }
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  }

  if (dismissed || (!deferredPrompt && !showIOSBanner)) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-md px-4 md:bottom-4">
      <div className="flex items-center gap-3 rounded-2xl border border-forest-900/10 bg-white p-4 shadow-lg">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-to-br from-forest-800 to-forest-600 text-marigold-300 font-display text-sm font-bold">
          W
        </span>
        <div className="flex-1 text-sm">
          <p className="font-semibold text-forest-900">Add Wano to your home screen</p>
          <p className="text-forest-800/60">
            {showIOSBanner
              ? <>Tap <span className="font-medium">Share</span>, then <span className="font-medium">Add to Home Screen</span>.</>
              : "Get the full-screen app experience — no browser bar."}
          </p>
        </div>
        <div className="flex flex-none flex-col items-end gap-1">
          {!showIOSBanner && (
            <button
              type="button"
              onClick={install}
              className="rounded-full bg-marigold-500 px-3 py-1.5 text-xs font-semibold text-forest-950 transition hover:bg-marigold-400"
            >
              Install
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-medium text-forest-800/50 hover:text-forest-800"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
