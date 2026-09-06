import Link from "next/link";
import { redirect } from "next/navigation";
import { finalizeFunzoneClaim, getFunzoneClaimByCode } from "@/lib/actions/funzone-actions";
import { formatRewardDiscount } from "@/lib/reward-format";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { getSession } from "@/lib/session";

export default async function ClaimPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const row = await getFunzoneClaimByCode(code);

  if (!row) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-xl font-semibold text-forest-900">Link not found</h1>
        <p className="mt-2 text-sm text-forest-800/60">This claim link doesn&apos;t exist.</p>
      </main>
    );
  }

  if (row.claim.status !== "pending") {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <h1 className="font-display text-xl font-semibold text-forest-900">Already claimed</h1>
        <p className="mt-2 text-sm text-forest-800/60">This prize has already been claimed.</p>
      </main>
    );
  }

  const session = await getSession();
  if (session?.role === "traveller") {
    const travellerProfile = await getTravellerProfileByUserId(session.userId);
    if (travellerProfile) {
      await finalizeFunzoneClaim(code, travellerProfile.id);
      redirect("/passport?tab=rewards");
    }
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      <h1 className="font-display text-2xl font-semibold text-forest-900">You won a prize! 🎉</h1>
      <p className="mt-2 text-forest-800/70">
        {row.reward.title} — {formatRewardDiscount(row.reward.discountType, row.reward.discountValue)}
      </p>
      <p className="mt-4 text-sm text-forest-800/60">
        Sign up or log in with the account you want the voucher on — it&apos;ll be waiting in your
        Passport wallet.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href={`/signup?claim=${code}`}
          className="rounded-full bg-marigold-500 px-5 py-2.5 text-sm font-semibold text-forest-950 transition hover:bg-marigold-400"
        >
          Sign up
        </Link>
        <Link
          href={`/login?next=${encodeURIComponent(`/claim/${code}`)}`}
          className="rounded-full border border-forest-900/15 px-5 py-2.5 text-sm font-semibold text-forest-900 transition hover:bg-forest-50"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
