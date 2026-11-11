import Link from "next/link";
import { getSession } from "@/lib/session";
import { getTravellerBookings, getTravellerProfileByUserId } from "@/lib/data/traveller";
import { getReviewableBookings } from "@/lib/data/reviews";
import { getRewardsSummary, getTierStatus, getMyWallet, getPointsShopCatalog } from "@/lib/data/rewards";
import { getPointsSummary, POINT_VALUE_MINOR } from "@/lib/data/points";
import { getAllActiveDeals, getClaimedDealIds } from "@/lib/data/deals";
import { claimDealFormAction } from "@/lib/actions/deal-actions";
import { withRlsContext } from "@/lib/db-context";
import { REWARDS_PAGE_TABS, type RewardsPageTabKey } from "@/lib/rewards-tabs";
import { RewardsTabs } from "@/components/rewards-tabs";
import { TierBadge } from "@/components/tier-badge";
import { VisitorQrCard } from "@/components/visitor-qr-card";
import { RedeemPointsRewardButton } from "@/components/redeem-points-reward-button";
import { HowYouGotHereSection } from "@/components/how-you-got-here-section";
import { ShareReferralBlock } from "@/components/share-referral-block";
import { VoucherCard } from "@/components/voucher-card";
import { PastVouchersSection } from "@/components/past-vouchers-section";
import { ReviewForm } from "@/components/review-form";
import { formatRewardDiscount } from "@/lib/reward-format";

export default async function RewardsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  const { tab } = await searchParams;

  if (!session || session.role !== "traveller") {
    return (
      <main className="font-editorial-body bg-paper mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-16 text-center md:px-6">
        <Link
          href="/signup"
          className="flex w-full max-w-md flex-col items-center gap-3 border border-dashed border-ink/20 bg-white p-8 transition-colors hover:bg-ink/5"
        >
          <p className="eyebrow text-ember">Wano Rewards</p>
          <p className="font-serif-editorial text-2xl text-ink">Create your Wano Passport</p>
          <p className="text-sm text-ink/60">
            Earn XP on every booking, review, and referral, then spend it on perks — free to start.
          </p>
        </Link>
      </main>
    );
  }

  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return null;

  const [bookingRows, reviewableRows, rewardsSummary, tierStatus, pointsSummary, deals, claimedIds] =
    await Promise.all([
      getTravellerBookings(travellerProfile.id),
      getReviewableBookings(travellerProfile.id),
      getRewardsSummary(travellerProfile.id, travellerProfile.persona, travellerProfile.city),
      getTierStatus(travellerProfile.id),
      getPointsSummary(travellerProfile.id),
      getAllActiveDeals(),
      getClaimedDealIds(travellerProfile.id),
    ]);

  const [wallet, pointsShopCatalog] = await withRlsContext(
    { userId: session.userId, role: "traveller", travellerProfileId: travellerProfile.id },
    (tx) => Promise.all([getMyWallet(travellerProfile.id, tx), getPointsShopCatalog(tx)]),
  );

  const reviewableBookingIds = new Set(reviewableRows.map((r) => r.booking.id));
  const activeTab: RewardsPageTabKey = REWARDS_PAGE_TABS.some((t) => t.key === tab)
    ? (tab as RewardsPageTabKey)
    : "rewards";

  return (
    <main className="font-editorial-body bg-paper mx-auto max-w-4xl px-4 py-8 md:px-6">
      <div>
        <h1 className="font-serif-editorial text-2xl text-ink">Rewards</h1>
        <p className="mt-1 text-sm text-ink/60">Points, perks, and everything you&apos;ve booked.</p>
      </div>

      <RewardsTabs active={activeTab} />

      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
        className="mt-6"
      >
        {activeTab === "rewards" && (
          <RewardsTab
            summary={rewardsSummary}
            tierStatus={tierStatus}
            pointsSummary={pointsSummary}
            wallet={wallet}
            deals={deals}
            claimedIds={claimedIds}
            pointsShopCatalog={pointsShopCatalog}
          />
        )}
        {activeTab === "bookings" && (
          <BookingsTab bookingRows={bookingRows} reviewableBookingIds={reviewableBookingIds} />
        )}
      </div>
    </main>
  );
}

function RewardsTab({
  summary,
  tierStatus,
  pointsSummary,
  wallet,
  deals,
  claimedIds,
  pointsShopCatalog,
}: {
  summary: Awaited<ReturnType<typeof getRewardsSummary>>;
  tierStatus: Awaited<ReturnType<typeof getTierStatus>>;
  pointsSummary: Awaited<ReturnType<typeof getPointsSummary>>;
  wallet: Awaited<ReturnType<typeof getMyWallet>>;
  deals: Awaited<ReturnType<typeof getAllActiveDeals>>;
  claimedIds: Awaited<ReturnType<typeof getClaimedDealIds>>;
  pointsShopCatalog: Awaited<ReturnType<typeof getPointsShopCatalog>>;
}) {
  const pastVoucherRows = [
    ...wallet.used.map(({ userReward, reward, target }) => ({
      id: userReward.id,
      title: reward.title,
      targetTitle: target?.title ?? "",
      statusLabel: "Used" as const,
      detail: userReward.redeemedAt ? `Redeemed ${userReward.redeemedAt.toLocaleDateString()}` : null,
    })),
    ...wallet.expired.map(({ userReward, reward, target }) => ({
      id: userReward.id,
      title: reward.title,
      targetTitle: target?.title ?? "",
      statusLabel: "Expired" as const,
      detail: null,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif-editorial text-2xl text-ink">Rewards</h2>
          <p className="mt-1 text-sm text-ink/60">
            Earned from booking, reviewing, and referring friends to Wano — spend XP on the perks below.
          </p>
        </div>
        <TierBadge
          tier={tierStatus.tier}
          nextTier={tierStatus.nextTier}
          progressToNextTier={tierStatus.progressToNextTier}
          remainingToNextTier={tierStatus.remainingToNextTier}
        />
      </div>

      <div className="grid gap-px overflow-hidden border border-ink/10 bg-ink/10 sm:grid-cols-2">
        <div className="bg-ink p-6 text-white">
          <p className="eyebrow text-white/60">XP to spend</p>
          <p className="font-mono-data mt-1 text-4xl font-semibold">{summary.availablePoints.toLocaleString()} XP</p>
          <p className="mt-1.5 text-xs text-white/60">{summary.totalPoints.toLocaleString()} XP earned lifetime</p>
        </div>
        <div className="bg-white p-6">
          <p className="eyebrow text-ink/40">Rewards points</p>
          <p className="font-mono-data mt-1 text-4xl font-semibold text-ink">{pointsSummary.balance.toLocaleString()}</p>
          <p className="mt-1.5 text-xs text-ink/60">
            ≈ UGX {(pointsSummary.balance * POINT_VALUE_MINOR).toLocaleString()} — spendable value, from
            referrals and welcome bonuses. Spending them on a booking is coming soon.
          </p>
        </div>
      </div>

      <VisitorQrCard />

      <section>
        <h3 className="font-serif-editorial text-lg text-ink">Redeem your XP</h3>
        {pointsShopCatalog.length === 0 ? (
          <p className="mt-3 text-sm text-ink/60">No rewards to redeem yet — check back soon.</p>
        ) : (
          <div className="mt-3 border-t border-ink/10">
            {pointsShopCatalog.map((reward) => {
              const affordable = summary.availablePoints >= (reward.pointsCost ?? Infinity);
              const percent = reward.pointsCost
                ? Math.min(100, Math.round((summary.availablePoints / reward.pointsCost) * 100))
                : 0;
              return (
                <div key={reward.id} className="border-b border-ink/10 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{reward.title}</p>
                      <p className="text-xs text-ink/60">
                        {formatRewardDiscount(reward.discountType, reward.discountValue)}
                        {reward.target ? ` · ${reward.target.title}` : ""}
                      </p>
                    </div>
                    {affordable ? (
                      <RedeemPointsRewardButton
                        rewardId={reward.id}
                        title={reward.title}
                        discountLabel={formatRewardDiscount(reward.discountType, reward.discountValue)}
                        pointsCost={reward.pointsCost ?? 0}
                      />
                    ) : (
                      <span className="font-mono-data flex-none text-xs text-ink/40">
                        Need {((reward.pointsCost ?? 0) - summary.availablePoints).toLocaleString()} more XP
                      </span>
                    )}
                  </div>
                  {!affordable && (
                    <div className="mt-2.5">
                      <div className="h-[3px] w-full bg-ink/10">
                        <div className="h-full bg-ember" style={{ width: `${percent}%` }} />
                      </div>
                      <p className="font-mono-data mt-1 text-[11px] text-ink/50">
                        {summary.availablePoints.toLocaleString()} / {(reward.pointsCost ?? 0).toLocaleString()} XP
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <HowYouGotHereSection breakdown={summary.breakdown} pendingReferrals={summary.pendingReferrals} />

      {summary.referralCode && <ShareReferralBlock code={summary.referralCode} />}

      <section className="space-y-3">
        <h3 className="font-serif-editorial text-lg text-ink">
          Active {wallet.active.length > 0 && <span className="font-mono-data">({wallet.active.length})</span>}
        </h3>
        {wallet.active.length === 0 ? (
          <p className="text-sm text-ink/60">No active vouchers — claim one on a place or event page.</p>
        ) : (
          wallet.active.map(({ userReward, reward, target }) => (
            <VoucherCard
              key={userReward.id}
              userRewardId={userReward.id}
              title={reward.title}
              discountLabel={formatRewardDiscount(reward.discountType, reward.discountValue)}
              redemptionCode={userReward.redemptionCode}
              expiresAt={userReward.expiresAt.toISOString()}
              targetHref={target?.href}
              targetTitle={target?.title}
              isXpPrize={reward.source === "xp_draw"}
            />
          ))
        )}
      </section>

      <PastVouchersSection rows={pastVoucherRows} />

      <section>
        <h3 className="font-serif-editorial text-lg text-ink">Free deals</h3>
        {deals.length === 0 ? (
          <p className="mt-3 text-sm text-ink/60">No deals available right now.</p>
        ) : (
          <div className="mt-3 border-t border-ink/10">
            {deals.map(({ promo, listing }) => {
              const claimed = claimedIds.has(promo.id);
              return (
                <div
                  key={promo.id}
                  className="flex items-center justify-between gap-4 border-b border-ink/10 py-4"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{promo.title}</p>
                    <p className="text-xs text-ink/60">
                      {promo.discountText}
                      {listing ? ` · ${listing.title}` : ""}
                    </p>
                  </div>
                  {claimed ? (
                    <span className="eyebrow text-ink/40">Claimed</span>
                  ) : (
                    <form action={claimDealFormAction}>
                      <input type="hidden" name="promoCodeId" value={promo.id} />
                      <button
                        type="submit"
                        className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-ink/85"
                      >
                        Claim
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function BookingsTab({
  bookingRows,
  reviewableBookingIds,
}: {
  bookingRows: Awaited<ReturnType<typeof getTravellerBookings>>;
  reviewableBookingIds: Set<string>;
}) {
  const upcoming = bookingRows.filter(
    (b) => b.booking.status === "pending" || b.booking.status === "confirmed",
  );
  const completed = bookingRows.filter((b) => b.booking.status === "completed");
  const cancelled = bookingRows.filter((b) => b.booking.status === "cancelled");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif-editorial text-2xl text-ink">Your bookings</h2>
        <p className="mt-1 text-sm text-ink/60">
          Each booking is a direct contract between you and the Wano-verified business.
        </p>
      </div>

      {bookingRows.length === 0 ? (
        <div className="border border-ink/10 bg-white p-6 text-center">
          <p className="text-sm text-ink/60">You haven&apos;t made a booking yet.</p>
          <Link
            href="/explore"
            className="mt-3 inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ink/85"
          >
            Explore places
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <BookingGroup title="Upcoming" rows={upcoming} reviewableBookingIds={reviewableBookingIds} />
          <BookingGroup title="Completed" rows={completed} reviewableBookingIds={reviewableBookingIds} />
          <BookingGroup title="Cancelled" rows={cancelled} reviewableBookingIds={reviewableBookingIds} />
        </div>
      )}
    </div>
  );
}

function BookingGroup({
  title,
  rows,
  reviewableBookingIds,
}: {
  title: string;
  rows: Awaited<ReturnType<typeof getTravellerBookings>>;
  reviewableBookingIds: Set<string>;
}) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h3 className="font-serif-editorial text-lg text-ink">{title}</h3>
      <div className="mt-3 border-t border-ink/10">
        {[...rows].reverse().map(({ booking, listing, event, journey }) => (
          <div key={booking.id} id={`booking-${booking.id}`} className="scroll-mt-20 border-b border-ink/10 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-ink">{listing?.title ?? event?.title}</p>
                <p className="text-sm text-ink/60">
                  {journey ? `${journey.name} · ` : ""}
                  <Link href={`/bookings/${booking.bookingRef}`} className="hover:text-ember hover:underline">
                    ref {booking.bookingRef}
                  </Link>
                </p>
                {(booking.visitDate || booking.partySize) && (
                  <p className="text-xs text-ink/50">
                    {booking.visitDate ? `${booking.visitDate}${booking.visitTime ? ` at ${booking.visitTime}` : ""}` : ""}
                    {booking.visitDate && booking.partySize ? " · " : ""}
                    {booking.partySize ? `Party of ${booking.partySize}` : ""}
                  </p>
                )}
              </div>
              <span className="eyebrow flex-none capitalize text-ink/40">{booking.status}</span>
            </div>
            {listing && reviewableBookingIds.has(booking.id) && (
              <ReviewForm bookingId={booking.id} listingTitle={listing.title} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
