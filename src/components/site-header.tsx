import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth-actions";
import { navItemsFor } from "@/lib/nav-items";
import type { SessionPayload } from "@/lib/session";
import { LogOutIcon } from "@/components/icons";

export function SiteHeader({ session }: { session: SessionPayload | null }) {
  const items = navItemsFor(session?.role ?? "guest");

  return (
    <header className="sticky top-0 z-40 border-b border-forest-900/10 bg-sand-50/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-forest-800 to-forest-600 text-marigold-300 font-display text-base font-bold">
            W
          </span>
          <span className="font-display text-lg font-semibold text-forest-900">
            Wano
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-forest-800/80 transition hover:text-forest-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-full border border-forest-800/15 px-3 py-1.5 text-sm font-medium text-forest-800 transition hover:bg-forest-800/5"
              >
                <LogOutIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </form>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm font-medium text-forest-800 sm:inline"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-marigold-500 px-4 py-2 text-sm font-semibold text-forest-950 shadow-sm transition hover:bg-marigold-400"
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
