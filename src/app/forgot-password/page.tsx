import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="font-editorial-body bg-paper flex min-h-[70vh] flex-col justify-center px-4 py-12 md:px-6">
      <div className="mx-auto w-full max-w-sm">
        <p className="eyebrow text-ember">Reset password</p>
        <h1 className="font-serif-editorial mt-3 text-3xl text-ink">Forgot your password?</h1>
        <p className="mt-2 text-sm text-ink/60">
          Enter the email on your account and we&rsquo;ll send you a link to set a new password.
        </p>
        <div className="mt-8 border border-ink/10 bg-white p-6">
          <ForgotPasswordForm />
        </div>
        <p className="mt-6 text-center text-sm text-forest-800/70">
          <Link href="/login" className="font-medium text-nile-700 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}
