import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { CameraIcon, TrophyIcon, UserIcon } from "@/components/icons";
import { PassportGrid } from "@/components/passport-grid";
import { PassportTabs } from "@/components/passport-tabs";
import { ReviewForm } from "@/components/review-form";
import { PASSPORT_TABS, type PassportTabKey } from "@/lib/passport-tabs";
import { requireRole } from "@/lib/auth";
import { claimDealFormAction } from "@/lib/actions/deal-actions";
import { getAllActiveDeals, getClaimedDealIds } from "@/lib/data/deals";
import { getReviewableBookings } from "@/lib/data/reviews";
import { getRewardsSummary } from "@/lib/data/rewards";
import { getPassportProgress, getTravellerBookings, getTravellerProfileByUserId } from "@/lib/data/traveller";

export default async function PassportPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireRole("traveller");
  const { tab } = await searchParams;

  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return null;

  const [user, passportProgress, bookingRows, reviewableRows, rewardsSummary, deals, claimedIds] =
    await Promise.all([
      db.select().from(users).where(eq(users.id, session.userId)).limit(1).then((r) => r[0]),
      getPassportProgress(travellerProfile.id),
      getTravellerBookings(travellerProfile.id),
      getReviewableBookings(travellerProfile.id),
      getRewardsSummary(travellerProfile.id, travellerProfile.persona, travellerProfile.city),
      getAllActiveDeals(),
      getClaimedDealIds(travellerProfile.id),
    ]);
  const reviewableBookingIds = new Set(reviewableRows.map((r) => r.booking.id));
  const { progress, stampCount, totalJourneys, grandPrizeQualified } = passportProgress;

  const defaultTab: PassportTabKey = stampCount > 0 ? "stamps" : bookingRows.length > 0 ? "bookings" : "stamps";
  const activeTab: PassportTabKey = PASSPORT_TABS.some((t) => t.key === tab)
    ? (tab as PassportTabKey)
    : defaultTab;

  const joined = user
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(user.createdAt))
    : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-none">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-forest-100 text-forest-500">
              <UserIcon className="h-8 w-8" />
            </span>
            <Link
              href="/passport?tab=account"
              aria-label="Change profile photo"
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-forest-800 text-white"
            >
              <CameraIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-forest-900">
              {travellerProfile.displayName}
            </h1>
            <p className="text-sm text-forest-800/60">
              @{user?.username ?? "member"}
              {travellerProfile.city ? ` · ${travellerProfile.city}` : ""}
              {joined ? ` · Joined ${joined}` : ""}
            </p>
          </div>
        </div>
        <div className="flex-none rounded-2xl border border-marigold-300 bg-marigold-50 px-4 py-2 text-right">
          <p className="text-lg font-semibold text-marigold-900">{rewardsSummary.totalPoints}</p>
          <p className="text-xs text-marigold-800/70">points</p>
        </div>
      </div>

      <PassportTabs active={activeTab} />

      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
        className="mt-6"
      >
        {activeTab === "stamps" && (
          <StampsTab
            progress={progress}
            stampCount={stampCount}
            totalJourneys={totalJourneys}
            grandPrizeQualified={grandPrizeQualified}
          />
        )}
        {activeTab === "bookings" && (
          <BookingsTab bookingRows={bookingRows} reviewableBookingIds={reviewableBookingIds} />
        )}
        {activeTab === "rewards" && (
          <RewardsTab summary={rewardsSummary} deals={deals} claimedIds={claimedIds} />
        )}
        {activeTab !== "stamps" && activeTab !== "bookings" && activeTab !== "rewards" && (
          <PlaceholderPanel title={PASSPORT_TABS.find((t) => t.key === activeTab)!.label} />
        )}
      </div>
    </main>
  );
}

function StampsTab({
  progress,
  stampCount,
  totalJourneys,
  grandPrizeQualified,
}: {
  progress: Awaited<ReturnType<typeof getPassportProgress>>["progress"];
  stampCount: number;
  totalJourneys: number;
  grandPrizeQualified: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-forest-900">Wano Passport</h2>
        <p className="mt-1 text-sm text-forest-800/60">
          Every Wano Journey you book stamps your Passport. Collect all {totalJourneys} for the grand
          prize draw.
        </p>
      </div>
      <section className="rounded-2xl border border-forest-900/10 bg-white p-6">
        <PassportGrid progress={progress} />
        <div className="mt-6 h-2.5 w-full overflow-hidden rounded-full bg-forest-50">
          <div
            className="h-full rounded-full bg-forest-700 transition-all"
            style={{ width: `${(stampCount / totalJourneys) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-forest-800/60">
          {stampCount} / {totalJourneys} stamps
        </p>
      </section>
      <section
        className={`flex items-center gap-4 rounded-2xl border p-5 ${
          grandPrizeQualified ? "border-marigold-400 bg-marigold-50" : "border-forest-900/10 bg-white"
        }`}
      >
        <TrophyIcon className={`h-9 w-9 ${grandPrizeQualified ? "text-marigold-700" : "text-forest-300"}`} />
        <div>
          <h3 className="font-display font-semibold text-forest-900">
            {grandPrizeQualified ? "You're entered in the grand prize draw!" : "Grand prize draw"}
          </h3>
          <p className="text-sm text-forest-800/70">
            {grandPrizeQualified
              ? "A free return trip, a final-match ticket, and a feature on official channels — good luck."
              : `Collect all ${totalJourneys} stamps to unlock your entry.`}
          </p>
        </div>
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
        <h2 className="font-display text-xl font-semibold text-forest-900">Your bookings</h2>
        <p className="mt-1 text-sm text-forest-800/60">
          Each booking is a direct contract between you and the Wano-verified business.
        </p>
      </div>

      {bookingRows.length === 0 ? (
        <div className="rounded-2xl border border-forest-900/10 bg-white p-6 text-center">
          <p className="text-sm text-forest-800/60">You haven&apos;t made a booking yet.</p>
          <Link
            href="/explore"
            className="mt-3 inline-flex rounded-full bg-forest-800 px-4 py-2 text-sm font-semibold text-white"
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
    <section className="space-y-3">
      <h3 className="font-display text-lg font-semibold text-forest-900">{title}</h3>
      {[...rows].reverse().map(({ booking, listing, journey }) => (
        <div key={booking.id} className="rounded-2xl border border-forest-900/10 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-forest-900">{listing.title}</p>
              <p className="text-sm text-forest-800/60">
                {journey ? `${journey.name} · ` : ""}ref {booking.bookingRef}
              </p>
            </div>
            <span className="rounded-full bg-forest-100 px-3 py-1 text-xs font-medium capitalize text-forest-800">
              {booking.status}
            </span>
          </div>
          {reviewableBookingIds.has(booking.id) && (
            <ReviewForm bookingId={booking.id} listingTitle={listing.title} />
          )}
        </div>
      ))}
    </section>
  );
}

function RewardsTab({
  summary,
  deals,
  claimedIds,
}: {
  summary: Awaited<ReturnType<typeof getRewardsSummary>>;
  deals: Awaited<ReturnType<typeof getAllActiveDeals>>;
  claimedIds: Awaited<ReturnType<typeof getClaimedDealIds>>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-forest-900">Rewards</h2>
        <p className="mt-1 text-sm text-forest-800/60">
          Earned from booking, reviewing, and referring friends to Wano.
        </p>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-forest-800 to-forest-600 p-6 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-white/70">Your balance</p>
        <p className="mt-1 font-display text-4xl font-bold">{summary.totalPoints.toLocaleString()} pts</p>
      </div>

      <section className="space-y-2">
        <h3 className="font-display text-lg font-semibold text-forest-900">How you got here</h3>
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
        <section className="rounded-2xl border border-forest-900/10 bg-white p-5">
          <h3 className="font-display text-lg font-semibold text-forest-900">Refer a friend</h3>
          <p className="mt-1 text-sm text-forest-800/60">
            Earn 150 pts every time someone joins Wano with your code.
          </p>
          <p className="mt-2 inline-block rounded-lg bg-forest-50 px-3 py-1.5 font-mono text-sm font-semibold text-forest-900">
            {summary.referralCode}
          </p>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-forest-900">Redeem</h3>
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
    </div>
  );
}

function PlaceholderPanel({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-forest-900/15 bg-white p-8 text-center text-sm text-forest-800/60">
      {title} content is moving in here next.
    </div>
  );
}
