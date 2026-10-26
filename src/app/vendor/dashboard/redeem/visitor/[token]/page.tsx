import Link from "next/link";
import { verifyVisitorTokenForVendor } from "@/lib/actions/reward-actions";
import { VisitorClaimableList } from "@/components/visitor-claimable-list";
import { CheckInOnOpen } from "./check-in-on-open";

export default async function RedeemVisitorPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ via?: string }>;
}) {
  const [{ token }, { via }] = await Promise.all([params, searchParams]);
  const check = await verifyVisitorTokenForVendor(token);

  return (
    <div className="mx-auto max-w-md space-y-4 py-6">
      <Link href="/vendor/dashboard/redeem" className="eyebrow text-ink/40 hover:text-ink">
        ← Redeem
      </Link>
      {check.ok && <CheckInOnOpen token={token} via={via === "code" ? "code" : "qr"} />}
      <VisitorClaimableList check={check} />
    </div>
  );
}
