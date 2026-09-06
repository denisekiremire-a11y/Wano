import Link from "next/link";
import { verifyRewardTokenForVendor } from "@/lib/actions/reward-actions";
import { RedeemVoucherPanel } from "../../redeem-voucher-panel";

export default async function RedeemTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const check = await verifyRewardTokenForVendor(token);

  return (
    <div className="mx-auto max-w-md space-y-4 py-6">
      <Link href="/vendor/dashboard/redeem" className="text-sm text-forest-700 hover:underline">
        ← Redeem
      </Link>
      <RedeemVoucherPanel check={check} userRewardId={check.userRewardId} />
    </div>
  );
}
