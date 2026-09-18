"use client";

import { useId } from "react";

/** The WANO wordmark — "WAN" in the display face, with the "O" replaced by
 * a map-pin glyph (ember) whose hole is sized to actually read as an "O"
 * letterform, plus a small trailing dot beneath its point — per the brand
 * mark supplied for the site header. */
export function Logo({ className = "" }: { className?: string }) {
  const maskId = useId();
  return (
    <span className={`inline-flex items-start ${className}`}>
      <span className="font-editorial">WAN</span>
      <svg viewBox="0 0 24 29" className="-ml-0.5 h-[1.15em] w-auto" aria-hidden>
        <mask id={maskId}>
          <rect width="24" height="29" fill="white" />
          <circle cx="12" cy="7" r="4.3" fill="black" />
        </mask>
        <path
          d="M12 0C8.13 0 5 3.13 5 7c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
          fill="var(--color-ember)"
          mask={`url(#${maskId})`}
        />
        <circle cx="12" cy="27" r="1.8" fill="var(--color-ember)" />
      </svg>
    </span>
  );
}
