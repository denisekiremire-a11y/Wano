import Link from "next/link";
import { verifyRewardTokenForVendor } from "@/lib/actions/reward-actions";
import { RedeemVoucherPanel } from "../../redeem-voucher-panel";

export default async function RedeemTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const check = await verifyRewardTokenForVendor(token);

  return (
    <div className="mx-auto max-w-md space-y-4 py-6">
      <Link href="/vendor/dashboard/redeem" className="eyebrow text-ink/40 hover:text-ink">
        ← Redeem
      </Link>
      <RedeemVoucherPanel check={check} userRewardId={check.userRewardId} />
    </div>
  );
}
