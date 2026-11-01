import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string; suspended?: string }>;
}) {
  const { next, reset, suspended } = await searchParams;

  return (
    <main className="font-editorial-body bg-paper flex min-h-[70vh] flex-col justify-center px-4 py-12 md:px-6">
      <div className="mx-auto w-full max-w-sm">
        <p className="eyebrow text-ember">Log in</p>
        <h1 className="font-serif-editorial mt-3 text-3xl text-ink">Welcome back</h1>
        <p className="mt-2 text-sm text-ink/60">
          Log in to see your deals, bookings and saved places.
        </p>
        {reset === "1" && (
          <p className="mt-4 rounded-lg border border-forest-200 bg-forest-50 px-3 py-2 text-sm text-forest-800">
            Your password has been reset. Log in with your new password.
          </p>
        )}
        {suspended === "1" && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            This account has been suspended. Contact support if you think this is a mistake.
          </p>
        )}
        <div className="mt-8 border border-ink/10 bg-white p-6">
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
