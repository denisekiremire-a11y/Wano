import { requireRole } from "@/lib/auth";
import { getAllActiveDeals, getClaimedDealIds } from "@/lib/data/deals";
import { getRewardsSummary } from "@/lib/data/rewards";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { claimDealFormAction } from "@/lib/actions/deal-actions";

export default async function RewardsPage() {
  const session = await requireRole("traveller");
  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return null;

  const [summary, deals, claimedIds] = await Promise.all([
    getRewardsSummary(travellerProfile.id, travellerProfile.persona, travellerProfile.city),
    getAllActiveDeals(),
    getClaimedDealIds(travellerProfile.id),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="font-display text-2xl font-semibold text-forest-900">Rewards</h1>
      <p className="mt-1 text-sm text-forest-800/60">
        Earned from booking, reviewing, and referring friends to Wano.
      </p>

      <div className="mt-6 rounded-2xl bg-gradient-to-br from-forest-800 to-forest-600 p-6 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-white/70">Your balance</p>
        <p className="mt-1 font-display text-4xl font-bold">{summary.totalPoints.toLocaleString()} pts</p>
      </div>

      <section className="mt-6 space-y-2">
        <h2 className="font-display text-lg font-semibold text-forest-900">How you got here</h2>
        {summary.breakdown.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-xl border border-forest-900/10 bg-white p-3"
          >
            <div>
              <p className="text-sm font-medium text-forest-900">{row.label}</p>
              <p className="text-xs text-forest-800/50">{row.count}</p>
            </div>
            <span className="text-sm font-semibold text-forest-800">+{row.points} pts</span>
          </div>
        ))}
      </section>

      {summary.referralCode && (
        <section className="mt-6 rounded-2xl border border-forest-900/10 bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-forest-900">Refer a friend</h2>
          <p className="mt-1 text-sm text-forest-800/60">
            Earn 150 pts every time someone joins Wano with your code.
          </p>
          <p className="mt-2 inline-block rounded-lg bg-forest-50 px-3 py-1.5 font-mono text-sm font-semibold text-forest-900">
            {summary.referralCode}
          </p>
        </section>
      )}

      <section className="mt-6 space-y-3">
        <h2 className="font-display text-lg font-semibold text-forest-900">Redeem</h2>
        {deals.length === 0 ? (
          <p className="text-sm text-forest-800/60">No deals available right now.</p>
        ) : (
          deals.map(({ promo, listing }) => {
            const claimed = claimedIds.has(promo.id);
            return (
              <div
                key={promo.id}
                className="flex items-center justify-between rounded-xl border border-forest-900/10 bg-white p-4"
              >
                <div>
                  <p className="text-sm font-medium text-forest-900">{promo.title}</p>
                  <p className="text-xs text-forest-800/60">
                    {promo.discountText}
                    {listing ? ` · ${listing.title}` : ""}
                  </p>
                </div>
                {claimed ? (
                  <span className="rounded-full bg-forest-100 px-3 py-1 text-xs font-medium text-forest-800">
                    Claimed
                  </span>
                ) : (
                  <form action={claimDealFormAction}>
                    <input type="hidden" name="promoCodeId" value={promo.id} />
                    <button
                      type="submit"
                      className="rounded-full bg-marigold-500 px-3 py-1.5 text-xs font-semibold text-forest-950 transition hover:bg-marigold-400"
                    >
                      Claim
                    </button>
                  </form>
                )}
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
