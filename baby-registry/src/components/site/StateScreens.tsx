import { Settings, TriangleAlert } from "lucide-react";

export function SetupNotice() {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-sage-100 text-sage-700">
        <Settings className="size-6" strokeWidth={1.5} aria-hidden />
      </span>
      <h1 className="mt-5 text-4xl">The registry is being set up</h1>
      <p className="mt-3 text-ink-soft">
        Please check back soon. (For the family: the Supabase connection isn’t configured yet — see <code>.env.example</code> and{" "}
        <code>docs/DEPLOYMENT.md</code>.)
      </p>
    </main>
  );
}

export function ErrorScreen({ message, retry }: { message?: string; retry?: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-xl flex-col items-center justify-center px-6 text-center" role="alert">
      <span className="flex size-14 items-center justify-center rounded-full bg-blush text-clay-dark">
        <TriangleAlert className="size-6" strokeWidth={1.5} aria-hidden />
      </span>
      <h1 className="mt-5 text-4xl">We couldn’t load the registry</h1>
      <p className="mt-3 text-ink-soft">{message ?? "Something went wrong on our side. Please try again in a moment."}</p>
      {retry && <div className="mt-6">{retry}</div>}
    </main>
  );
}
