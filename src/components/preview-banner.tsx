/** Always-on, site-wide notice that this deployment is a preview build —
 * vendors, listings, bookings, and reviews are demo/seeded content, not real
 * businesses or transactions. Sticky under the header so it stays visible
 * while scrolling, same stacking pattern as SeasonRibbon. Not dismissible —
 * the whole point is that a demo viewer can't lose it. */
export function PreviewBanner() {
  return (
    <div className="sticky top-0 z-50 flex h-9 items-center justify-center gap-2 bg-amber-400 px-4 text-center text-xs font-semibold text-amber-950">
      <span aria-hidden>⚠</span>
      <span className="truncate">
        Preview build — sample data throughout. Vendors, bookings &amp; reviews shown are not real.
      </span>
    </div>
  );
}
