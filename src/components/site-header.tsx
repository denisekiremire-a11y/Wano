import Link from "next/link";
import { HeaderMessagesLink } from "@/components/header-messages-link";
import { HeaderNavLink } from "@/components/header-nav-link";
import { HeaderSearch } from "@/components/header-search";
import { Logo } from "@/components/logo";
import { navItemsFor } from "@/lib/nav-items";
import type { SessionPayload } from "@/lib/session";

export function SiteHeader({
  session,
  navBadges = {},
}: {
  session: SessionPayload | null;
  navBadges?: Record<string, number>;
}) {
  const items = navItemsFor(session?.role ?? "guest", session?.adminLevel);

  return (
    <header className="font-editorial-body sticky top-9 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-[70px] max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="text-xl text-ink" aria-label="Wano home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-5 overflow-x-auto md:flex">
          {items.map((item) => (
            <HeaderNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              badge={navBadges[item.href]}
              matchPrefixes={item.matchPrefixes}
            />
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <HeaderSearch />
          {session ? (
            <HeaderMessagesLink />
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm font-medium text-ink sm:inline"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-ember px-[22px] py-3 text-sm font-bold text-paper transition-colors hover:bg-ink"
              >
                Join Wano
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
