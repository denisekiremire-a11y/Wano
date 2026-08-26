import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 md:px-6">
      <h1 className="font-display text-2xl font-semibold text-forest-900">Welcome back</h1>
      <p className="mt-1 text-sm text-forest-800/70">
        Log in to see your Wano Passport, deals, and booking history.
      </p>
      <div className="mt-6 rounded-2xl border border-forest-900/10 bg-white p-6">
        <LoginForm next={next} />
      </div>
      <p className="mt-4 text-center text-xs text-forest-800/50">
        Vendor demo: jinja.nile.resort@example.com · Admin demo: admin@pamoja2027.ug
        <br />
        Password for all seeded demo accounts: Passport2027!
      </p>
    </main>
  );
}
