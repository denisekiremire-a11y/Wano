/** A small line-drawn peach — a nod to the baby's nickname, in the site's neutral colours. */
export function PeachMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 7.5c-3.9-1.6-8 .9-8 5.4C4 17.2 7.6 21 12 21s8-3.8 8-8.1c0-4.5-4.1-7-8-5.4Z" />
      <path d="M12 7.5c-.9 2.5-.9 5.5.4 8.5" opacity=".55" />
      <path d="M12 7.6c.2-1.9 1.2-3.4 2.9-4.3" />
      <path d="M13.4 5.4c1.4-1.7 3.6-2.2 5.3-1.5-.7 1.9-2.8 3-5.3 1.5Z" />
    </svg>
  );
}
