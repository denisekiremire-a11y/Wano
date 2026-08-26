"use client";

import "./globals.css";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-forest-800 to-forest-600 text-marigold-300 font-display text-base font-bold">
            W
          </span>
          <h1 className="font-display text-2xl font-semibold text-forest-900">
            Wano hit a snag
          </h1>
          <p className="text-sm text-forest-800/70">
            Something broke at the app level. It&apos;s been logged — reloading usually fixes it.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-forest-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-700"
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
