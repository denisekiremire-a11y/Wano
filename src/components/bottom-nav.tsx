import Link from "next/link";
import { mobileNavItemsFor } from "@/lib/nav-items";
import type { SessionPayload } from "@/lib/session";
import { NavIcon } from "@/components/nav-icon";

export function BottomNav({
  session,
  navBadges = {},
}: {
  session: SessionPayload | null;
  navBadges?: Record<string, number>;
}) {
  const items = mobileNavItemsFor(session?.role ?? "guest");

  // Five or fewer items sit comfortably in an equal-width row (the
  // traveller/guest case). Above that (vendor, and especially admin's 13
  // sections) an equal-width grid crushes every label unreadable — a
  // horizontally scrollable strip of fixed-width items keeps every item
  // reachable and legible regardless of how many exist, rather than
  // arbitrarily hiding some with no other way to reach them (neither the
  // admin nor vendor layout has a secondary in-page nav).
  const wide = items.length > 5;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-forest-900/10 bg-sand-50/95 backdrop-blur md:hidden">
      <div
        className={
          wide
            ? "mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-[env(safe-area-inset-bottom)]"
            : "mx-auto grid max-w-6xl px-2 pb-[env(safe-area-inset-bottom)]"
        }
        style={wide ? undefined : { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-none flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-forest-800/70 transition active:text-forest-900 ${
              wide ? "w-16" : ""
            }`}
          >
            <span className="relative">
              <NavIcon icon={item.icon} className="h-5 w-5" />
              {navBadges[item.href] > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-semibold text-white">
                  {navBadges[item.href]}
                </span>
              )}
            </span>
            <span className="truncate leading-tight">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
