import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { withRlsContext } from "@/lib/db-context";
import { getVendorActiveCampaigns, getVendorRedemptionsToday } from "@/lib/data/rewards";
import { getVendorProfileByUserId } from "@/lib/data/vendor";
import { formatRewardDiscount } from "@/lib/reward-format";
import { PinForm } from "./pin-form";
import { RedeemByCode } from "./redeem-by-code";

export default async function VendorRedeemPage() {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return null;

  const [redemptionsToday, campaigns] = await withRlsContext(
    { userId: session.userId, role: "vendor", vendorProfileId: vendorProfile.id },
    (tx) => Promise.all([getVendorRedemptionsToday(vendorProfile.id, tx), getVendorActiveCampaigns(vendorProfile.id, tx)]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink">Redeem</h1>
        <p className="mt-1 text-sm text-ink/60">
          A traveller&apos;s camera opens their QR straight to this venue&apos;s verify page — or type
          their code in below if a scan fails. Either way, your PIN is required to mark it redeemed.
        </p>
        <Link href="/vendor/dashboard/redeem/tickets" className="mt-2 inline-block text-sm text-ember hover:underline">
          Checking in event tickets instead? →
        </Link>
      </div>

      <section className="space-y-3 border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">Venue PIN</h2>
        <p className="text-sm text-ink/60">
          Staff enter this at the counter — they never need your login password.
        </p>
        <PinForm hasPin={Boolean(vendorProfile.staffPinHash)} />
        {vendorProfile.pinRotatedAt && (
          <p className="eyebrow text-ink/40">
            Last set {vendorProfile.pinRotatedAt.toLocaleDateString()}.
          </p>
        )}
      </section>

      <section className="space-y-3 border border-ink/10 bg-white p-5">
        <h2 className="font-serif-editorial text-lg text-ink">Enter a code</h2>
        <RedeemByCode />
      </section>

      <section className="space-y-3">
        <h2 className="font-serif-editorial text-lg text-ink">Today&apos;s redemptions</h2>
        {redemptionsToday.length === 0 ? (
          <p className="text-sm text-ink/60">Nothing redeemed yet today.</p>
        ) : (
          <div className="border-t border-ink/10">
            {redemptionsToday.map(({ userReward, reward }) => (
              <div key={userReward.id} className="flex items-center justify-between border-b border-ink/10 py-3">
                <p className="text-sm font-medium text-ink">{reward.title}</p>
                <p className="font-mono-data text-xs text-ink/50">
                  {userReward.redeemedAt?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif-editorial text-lg text-ink">Active reward campaigns</h2>
        {campaigns.length === 0 ? (
          <p className="text-sm text-ink/60">
            No rewards are attached to your listing right now — the Wano team sets these up.
          </p>
        ) : (
          <div className="border-t border-ink/10">
            {campaigns.map((reward) => (
              <div key={reward.id} className="flex items-center justify-between border-b border-ink/10 py-3">
                <p className="text-sm font-medium text-ink">{reward.title}</p>
                <p className="font-mono-data text-xs text-ember">
                  {formatRewardDiscount(reward.discountType, reward.discountValue)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
