import { SignupForm } from "./signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 md:px-6">
      <h1 className="font-display text-2xl font-semibold text-forest-900">
        Join Wano
      </h1>
      <p className="mt-1 text-sm text-forest-800/70">
        Free to join. Businesses get reviewed for Wano verification before going live.
      </p>
      {ref && (
        <p className="mt-2 text-sm text-forest-700">
          You were invited with code <span className="font-mono font-semibold">{ref}</span> —
          they&apos;ll get credit once you sign up.
        </p>
      )}
      <div className="mt-6 rounded-2xl border border-forest-900/10 bg-white p-6">
        <SignupForm referralCode={ref} />
      </div>
    </main>
  );
}
