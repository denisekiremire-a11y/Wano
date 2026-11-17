import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-linen bg-cream/50">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-display text-lg italic text-ink-soft">Made with love for our little one.</p>
        <div className="flex gap-5">
          <Link href="/registry" className="hover:text-ink">
            Full wishlist
          </Link>
          <Link href="/my-gifts" className="hover:text-ink">
            My gifts
          </Link>
          <Link href="/admin" className="hover:text-ink" prefetch={false}>
            Family login
          </Link>
        </div>
      </div>
    </footer>
  );
}
