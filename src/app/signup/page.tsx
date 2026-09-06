import { cookies } from "next/headers";
import { REF_COOKIE } from "@/lib/referral-cookie";
import { getReferrerNameByCode } from "@/lib/data/traveller";
import { SignupForm } from "./signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref: refParam } = await searchParams;
  const cookieStore = await cookies();
  // The query param (from a fresh /join?ref= link) wins; the cookie is the
  // fallback for a visit that dropped the param along the way.
  const ref = refParam || cookieStore.get(REF_COOKIE)?.value || undefined;
  const referrerName = ref ? await getReferrerNameByCode(ref) : null;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 md:px-6">
      <h1 className="font-display text-2xl font-semibold text-forest-900">
        Join Wano
      </h1>
      <p className="mt-1 text-sm text-forest-800/70">
        Free to join. Businesses get reviewed for Wano verification before going live.
      </p>
      {ref && referrerName && (
        <p className="mt-2 text-sm text-forest-700">
          Referred by <span className="font-semibold">{referrerName}</span> — they&apos;ll get
          credit once you sign up.
        </p>
      )}
      <div className="mt-6 rounded-2xl border border-forest-900/10 bg-white p-6">
        <SignupForm referralCode={ref} />
      </div>
    </main>
  );
}
