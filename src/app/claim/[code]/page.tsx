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
      <main className="font-editorial-body bg-paper flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="font-serif-editorial text-2xl text-ink">Link not found</h1>
          <p className="mt-2 text-sm text-ink/60">This claim link doesn&apos;t exist.</p>
        </div>
      </main>
    );
  }

  if (row.claim.status !== "pending") {
    return (
      <main className="font-editorial-body bg-paper flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="font-serif-editorial text-2xl text-ink">Already claimed</h1>
          <p className="mt-2 text-sm text-ink/60">This prize has already been claimed.</p>
        </div>
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
    <main className="font-editorial-body bg-paper flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="max-w-md text-center">
        <p className="eyebrow text-ember">You won a prize</p>
        <h1 className="font-serif-editorial mt-3 text-3xl text-ink">
          {row.reward.title} —{" "}
          <span className="font-mono-data">
            {formatRewardDiscount(row.reward.discountType, row.reward.discountValue)}
          </span>
        </h1>
        <p className="mt-4 text-sm text-ink/60">
          Sign up or log in with the account you want the voucher on — it&apos;ll be waiting in your
          Passport wallet.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href={`/signup?claim=${code}`}
            className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold/90"
          >
            Sign up
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(`/claim/${code}`)}`}
            className="rounded-full border border-ink/20 px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink/5"
          >
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
