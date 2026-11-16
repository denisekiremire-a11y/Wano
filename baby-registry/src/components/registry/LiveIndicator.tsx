"use client";

import { useRegistry } from "./context";

export function LiveIndicator() {
  const { liveStatus } = useRegistry();
  if (liveStatus === "disabled") return null;
  const map = {
    connecting: { dot: "bg-sand", text: "Connecting…" },
    live: { dot: "bg-sage-600", text: "Live — updates instantly" },
    offline: { dot: "bg-clay", text: "Reconnecting…" },
  } as const;
  const s = map[liveStatus];
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted" data-testid="live-indicator" data-live={liveStatus}>
      <span className="relative flex size-2">
        {liveStatus === "live" && <span className="absolute inline-flex size-full animate-ping rounded-full bg-sage-400 opacity-60 [animation-duration:2.4s]" />}
        <span className={`relative inline-flex size-2 rounded-full ${s.dot}`} />
      </span>
      {s.text}
    </span>
  );
}
