"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-display text-2xl font-semibold text-forest-900">
        Something went wrong
      </h1>
      <p className="text-sm text-forest-800/70">
        This page hit a snag. It&apos;s been logged — try again, or head back home.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-forest-800/20 px-5 py-2.5 text-sm font-semibold text-forest-800 transition hover:bg-forest-800/5"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
