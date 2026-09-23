"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Client-only so it can read the current path for the active-link state —
 * kept as a small leaf component so SiteHeader itself stays a server
 * component. */
export function HeaderNavLink({
  href,
  label,
  badge,
  matchPrefixes,
}: {
  href: string;
  label: string;
  badge?: number;
  matchPrefixes?: string[];
}) {
  const pathname = usePathname();
  const matchesHref = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const isActive =
    matchesHref || (matchPrefixes?.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ?? false);

  return (
    <Link
      href={href}
      className={`relative shrink-0 whitespace-nowrap text-[15px] transition ${
        isActive ? "text-ember" : "text-muted hover:text-ink"
      }`}
    >
      {label}
      {badge != null && badge > 0 && (
        <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}
