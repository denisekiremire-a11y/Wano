import Link from "next/link";
import { checkPasswordResetTokenAction } from "@/lib/actions/password-reset-actions";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const { ok } = token ? await checkPasswordResetTokenAction(token) : { ok: false };

  return (
    <main className="font-editorial-body bg-paper flex min-h-[70vh] flex-col justify-center px-4 py-12 md:px-6">
      <div className="mx-auto w-full max-w-sm">
        <p className="eyebrow text-ember">Reset password</p>
        <h1 className="font-serif-editorial mt-3 text-3xl text-ink">
          {ok ? "Set a new password" : "This link isn't valid"}
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          {ok
            ? "Choose a new password for your account."
            : "This reset link has expired or has already been used. Request a new one from your account."}
        </p>
        <div className="mt-8 border border-ink/10 bg-white p-6">
          {ok ? (
            <ResetPasswordForm token={token!} />
          ) : (
            <Link
              href="/forgot-password"
              className="block w-full rounded-full bg-forest-800 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-forest-700"
            >
              Request a new link
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
