import Link from "next/link";
import { PeachMark } from "./PeachMark";

export function SiteHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-linen/80 bg-ivory/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-linen text-taupe">
            <PeachMark className="size-5 text-clay-dark" />
          </span>
          <span className="font-display text-xl font-medium tracking-tight text-ink sm:text-2xl">{title}</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm" aria-label="Main">
          <Link href="/registry" className="rounded-full px-3 py-2 text-ink-soft hover:bg-cream hover:text-ink">
            Wishlist
          </Link>
          <Link href="/my-gifts" className="rounded-full px-3 py-2 text-ink-soft hover:bg-cream hover:text-ink" data-testid="nav-my-gifts">
            My gifts
          </Link>
        </nav>
      </div>
    </header>
  );
}
