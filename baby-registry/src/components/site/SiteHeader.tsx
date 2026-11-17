import Link from "next/link";
import { Heart } from "lucide-react";

export function SiteHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-linen/80 bg-ivory/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-sage-100 text-sage-700">
            <Heart className="size-4" strokeWidth={1.75} aria-hidden />
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
