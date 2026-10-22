import Link from "next/link";
import { verifyVisitorTokenForVendor } from "@/lib/actions/reward-actions";
import { VisitorClaimableList } from "@/components/visitor-claimable-list";

export default async function RedeemVisitorPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const check = await verifyVisitorTokenForVendor(token);

  return (
    <div className="mx-auto max-w-md space-y-4 py-6">
      <Link href="/vendor/dashboard/redeem" className="eyebrow text-ink/40 hover:text-ink">
        ← Redeem
      </Link>
      <VisitorClaimableList check={check} />
    </div>
  );
}
