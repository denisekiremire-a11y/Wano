"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { NavItem } from "@/lib/nav-items";

function matches(pathname: string, href: string, matchPrefixes?: string[]) {
  const hit = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  return hit(href) || (matchPrefixes?.some(hit) ?? false);
}

/** Desktop-only admin nav group — a button that opens a dropdown of its
 * items on click. Closes on outside click, Escape, or navigating away. */
export function HeaderNavDropdown({
  label,
  items,
  badges = {},
}: {
  label: string;
  items: NavItem[];
  badges?: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const isActive = items.some((item) => matches(pathname, item.href, item.matchPrefixes));
  const groupBadge = items.reduce((sum, item) => sum + (badges[item.href] ?? 0), 0);

  useEffect(() => {
    // Closing on navigation is a legitimate one-off sync to an external
    // signal (the route), not state that belongs computed during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`relative flex items-center gap-1 whitespace-nowrap text-[15px] transition ${
          isActive ? "text-ember" : "text-muted hover:text-ink"
        }`}
      >
        {label}
        {groupBadge > 0 && (
          <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {groupBadge}
          </span>
        )}
        <svg
          width="9"
          height="9"
          viewBox="0 0 10 10"
          fill="none"
          className={`mt-px transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M1.5 3.5L5 7l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[180px] border border-ink/15 bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          {items.map((item) => {
            const active = matches(pathname, item.href, item.matchPrefixes);
            const badge = badges[item.href] ?? 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between gap-3 px-4 py-2 text-sm transition ${
                  active ? "text-ember" : "text-ink/80 hover:bg-ink/5 hover:text-ink"
                }`}
              >
                {item.label}
                {badge > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
