import Link from "next/link";
import { verifyEmailAction } from "@/lib/actions/email-verification-actions";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await verifyEmailAction(token) : { ok: false, alreadyUsed: false };

  return (
    <main className="font-editorial-body bg-paper">
      <section className="mx-auto max-w-lg px-4 py-16 text-center md:px-6">
        <h1 className="font-serif-editorial text-3xl text-ink">
          {result.ok
            ? "Email verified"
            : result.alreadyUsed
              ? "Already verified"
              : "That link isn't valid"}
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          {result.ok
            ? "You're all set — you can now send booking requests and earn referral rewards."
            : result.alreadyUsed
              ? "This link has already been used. If your email still isn't verified, request a new link from your account."
              : "This verification link has expired or doesn't exist. Request a new one from your account."}
        </p>
        <Link
          href="/explore"
          className="mt-6 inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/85"
        >
          Back to Wano
        </Link>
      </section>
    </main>
  );
}
