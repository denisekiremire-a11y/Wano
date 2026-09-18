/** The WANO wordmark — "WAN" in the display face, with the "O" replaced by
 * a map-pin glyph (ember, with a punched-through hole) and a small trailing
 * dot beneath its point, per the brand mark supplied for the site header. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-start ${className}`}>
      <span className="font-editorial">WAN</span>
      <svg viewBox="0 0 24 29" className="-ml-0.5 h-[1.15em] w-auto" aria-hidden>
        <path
          d="M12 0C8.13 0 5 3.13 5 7c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 4.5 12 4.5s2.5 1.12 2.5 2.5S13.38 9.5 12 9.5z"
          fill="var(--color-ember)"
        />
        <circle cx="12" cy="27" r="1.8" fill="var(--color-ember)" />
      </svg>
    </span>
  );
}
