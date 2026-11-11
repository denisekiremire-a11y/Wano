import Link from "next/link";
import { verifyRewardTokenForVendor } from "@/lib/actions/reward-actions";
import { RedeemVoucherPanel } from "@/app/vendor/dashboard/redeem/redeem-voucher-panel";

// Outside the vendor-only /vendor/dashboard layout on purpose: this is the
// page a traveller's voucher QR opens directly (see generateRewardQrAction),
// and it needs to work for a staff-link session too, not just a logged-in
// vendor — verifyRewardTokenForVendor itself (requireVendorAccess) is what
// actually gates it.
export default async function VoucherScanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const check = await verifyRewardTokenForVendor(token);

  return (
    <div className="font-editorial-body bg-paper min-h-screen">
      <div className="mx-auto max-w-md space-y-4 px-4 py-8">
        <Link href={check.backHref} className="eyebrow text-ink/40 hover:text-ink">
          ← Redeem
        </Link>
        <RedeemVoucherPanel check={check} userRewardId={check.userRewardId} />
      </div>
    </div>
  );
}
