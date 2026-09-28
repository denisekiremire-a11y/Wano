import { cookies } from "next/headers";
import { REF_COOKIE } from "@/lib/referral-cookie";
import { getReferrerNameByCode } from "@/lib/data/traveller";
import { SignupForm } from "./signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; claim?: string }>;
}) {
  const { ref: refParam, claim } = await searchParams;
  const cookieStore = await cookies();
  // The query param (from a fresh /join?ref= link) wins; the cookie is the
  // fallback for a visit that dropped the param along the way.
  const ref = refParam || cookieStore.get(REF_COOKIE)?.value || undefined;
  const referrerName = ref ? await getReferrerNameByCode(ref) : null;

  return (
    <main className="font-editorial-body bg-paper flex min-h-[70vh] flex-col justify-center px-4 py-12 md:px-6">
      <div className="mx-auto w-full max-w-md">
        <p className="eyebrow text-ember">Create account</p>
        <h1 className="font-serif-editorial mt-3 text-3xl text-ink">Join Wano</h1>
        <p className="mt-2 text-sm text-ink/60">
          Free to join. Businesses get reviewed for Wano verification before going live.
        </p>
        {ref && referrerName && (
          <p className="mt-2 text-sm text-ember">
            Referred by <span className="font-semibold">{referrerName}</span> — they&apos;ll get
            credit once you sign up.
          </p>
        )}
        <div className="mt-8 border border-ink/10 bg-white p-6">
          <SignupForm referralCode={ref} claimCode={claim} />
        </div>
      </div>
    </main>
  );
}
