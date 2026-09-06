import { requireRole } from "@/lib/auth";
import { getVendorActiveCampaigns, getVendorRedemptionsToday } from "@/lib/data/rewards";
import { getVendorProfileByUserId } from "@/lib/data/vendor";
import { formatRewardDiscount } from "@/lib/reward-format";
import { PinForm } from "./pin-form";
import { RedeemByCode } from "./redeem-by-code";

export default async function VendorRedeemPage() {
  const session = await requireRole("vendor");
  const vendorProfile = await getVendorProfileByUserId(session.userId);
  if (!vendorProfile) return null;

  const [redemptionsToday, campaigns] = await Promise.all([
    getVendorRedemptionsToday(vendorProfile.id),
    getVendorActiveCampaigns(vendorProfile.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest-900">Redeem</h1>
        <p className="mt-1 text-sm text-forest-800/60">
          A traveller&apos;s camera opens their QR straight to this venue&apos;s verify page — or type
          their code in below if a scan fails. Either way, your PIN is required to mark it redeemed.
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border border-forest-900/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-forest-900">Venue PIN</h2>
        <p className="text-sm text-forest-800/60">
          Staff enter this at the counter — they never need your login password.
        </p>
        <PinForm hasPin={Boolean(vendorProfile.staffPinHash)} />
        {vendorProfile.pinRotatedAt && (
          <p className="text-xs text-forest-800/45">
            Last set {vendorProfile.pinRotatedAt.toLocaleDateString()}.
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-forest-900/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-forest-900">Enter a code</h2>
        <RedeemByCode />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-forest-900">Today&apos;s redemptions</h2>
        {redemptionsToday.length === 0 ? (
          <p className="text-sm text-forest-800/60">Nothing redeemed yet today.</p>
        ) : (
          redemptionsToday.map(({ userReward, reward }) => (
            <div
              key={userReward.id}
              className="flex items-center justify-between rounded-xl border border-forest-900/10 bg-white p-3"
            >
              <p className="text-sm font-medium text-forest-900">{reward.title}</p>
              <p className="text-xs text-forest-800/50">
                {userReward.redeemedAt?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-forest-900">Active reward campaigns</h2>
        {campaigns.length === 0 ? (
          <p className="text-sm text-forest-800/60">
            No rewards are attached to your listing right now — the Wano team sets these up.
          </p>
        ) : (
          campaigns.map((reward) => (
            <div key={reward.id} className="rounded-xl border border-forest-900/10 bg-white p-3">
              <p className="text-sm font-medium text-forest-900">{reward.title}</p>
              <p className="text-xs text-forest-800/50">
                {formatRewardDiscount(reward.discountType, reward.discountValue)}
              </p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
