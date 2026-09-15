import Link from "next/link";
import { HeaderLogoutButton } from "@/components/header-logout-button";
import { HeaderNavLink } from "@/components/header-nav-link";
import { HeaderSearch } from "@/components/header-search";
import { navItemsFor } from "@/lib/nav-items";
import type { SessionPayload } from "@/lib/session";

export function SiteHeader({
  session,
  navBadges = {},
}: {
  session: SessionPayload | null;
  navBadges?: Record<string, number>;
}) {
  const items = navItemsFor(session?.role ?? "guest");

  return (
    <header className="sticky top-9 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="font-editorial flex items-center text-xl font-bold tracking-tight text-ink">
          WANO
          <span className="text-vermilion">.</span>
        </Link>

        <nav className="hidden items-center gap-5 overflow-x-auto md:flex">
          {items.map((item) => (
            <HeaderNavLink key={item.href} href={item.href} label={item.label} badge={navBadges[item.href]} />
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <HeaderSearch />
          {session ? (
            <HeaderLogoutButton />
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm font-medium text-ink/80 sm:inline"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-vermilion px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                Join free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
