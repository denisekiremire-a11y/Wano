import Link from "next/link";
import { Heart } from "lucide-react";
import { LoginForm } from "@/components/admin/LoginForm";
import { isSupabaseConfigured } from "@/lib/env";

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-sage-100 text-sage-700">
            <Heart className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <h1 className="mt-4 text-4xl">Family login</h1>
          <p className="mt-1 text-sm text-muted">For the registry owners only.</p>
        </div>
        <div className="card p-6">
          {!isSupabaseConfigured() ? (
            <p className="text-sm text-rose-700" role="alert">
              Supabase isn’t configured yet. Set the environment variables in <code>.env.example</code> and restart.
            </p>
          ) : (
            <>
              {sp.error === "not-admin" && (
                <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">
                  That account isn’t a registry administrator.
                </p>
              )}
              <LoginForm next={typeof sp.next === "string" ? sp.next : ""} />
            </>
          )}
        </div>
        <p className="mt-6 text-center text-sm">
          <Link href="/" className="text-muted hover:text-ink">
            ← Back to the registry
          </Link>
        </p>
      </div>
    </main>
  );
}
