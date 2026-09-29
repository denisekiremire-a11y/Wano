import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="font-editorial-body bg-paper flex min-h-[70vh] flex-col justify-center px-4 py-12 md:px-6">
      <div className="mx-auto w-full max-w-sm">
        <p className="eyebrow text-ember">Log in</p>
        <h1 className="font-serif-editorial mt-3 text-3xl text-ink">Welcome back</h1>
        <p className="mt-2 text-sm text-ink/60">
          Log in to see your deals, bookings and saved places.
        </p>
        <div className="mt-8 border border-ink/10 bg-white p-6">
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
