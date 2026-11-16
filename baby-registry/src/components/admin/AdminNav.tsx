"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Gift, LayoutDashboard, LogOut, Settings, Store, Ticket } from "lucide-react";
import { signOutAction } from "@/app/actions/admin";

const LINKS = [
  { href: "/admin", label: "Overview", Icon: LayoutDashboard },
  { href: "/admin/reservations", label: "Reservations", Icon: Ticket },
  { href: "/admin/gifts", label: "Gifts", Icon: Gift },
  { href: "/admin/retailers", label: "Shops", Icon: Store },
  { href: "/admin/settings", label: "Settings", Icon: Settings },
];

export function AdminNav({ email }: { email: string }) {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-linen bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/admin" className="py-3 font-display text-xl">
          Registry admin
        </Link>
        <nav className="-mb-px flex flex-1 gap-1 overflow-x-auto" aria-label="Admin">
          {LINKS.map(({ href, label, Icon }) => {
            const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-4 text-sm ${active ? "border-sage-700 text-ink" : "border-transparent text-muted hover:text-ink"}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-4" aria-hidden /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/" target="_blank" className="btn-ghost px-3 py-2 text-xs">
            <ExternalLink className="size-3.5" aria-hidden /> View registry
          </Link>
          <span className="max-w-40 truncate text-xs text-muted" title={email}>
            {email}
          </span>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="btn-ghost px-3 py-2 text-xs" aria-label="Sign out">
            <LogOut className="size-4" aria-hidden />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
