import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Account deleted",
};

export default function AccountDeletedPage() {
  return (
    <main className="font-editorial-body bg-paper">
      <section className="mx-auto max-w-2xl px-4 py-16 text-center md:px-6">
        <h1 className="font-serif-editorial text-3xl text-ink">Your account has been deleted</h1>
        <p className="mt-3 text-sm text-ink/70">
          Your personal details and everything you posted have been removed, and you&apos;ve been signed out.
          Thanks for exploring with Wano.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-ink underline">
          Back to Wano
        </Link>
      </section>
    </main>
  );
}
