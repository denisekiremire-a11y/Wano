import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-2xl font-semibold text-forest-900">Page not found</h1>
      <p className="text-sm text-forest-800/70">
        That page doesn&apos;t exist — it may have moved, or the link was wrong.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700"
        >
          Back to home
        </Link>
        <Link
          href="/explore"
          className="rounded-full border border-forest-800/20 px-5 py-2.5 text-sm font-semibold text-forest-800 transition hover:bg-forest-800/5"
        >
          Explore Wano
        </Link>
      </div>
    </main>
  );
}
