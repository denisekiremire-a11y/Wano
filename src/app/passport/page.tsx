import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { BirthdayEditor } from "@/components/birthday-editor";
import { FeedActivityToggle } from "@/components/feed-activity-toggle";
import { CameraIcon } from "@/components/icons";
import { HowYouGotHereSection } from "@/components/how-you-got-here-section";
import { LiteModeToggle } from "@/components/lite-mode-toggle";
import { LogoutButton } from "@/components/logout-button";
import { PassportGrid } from "@/components/passport-grid";
import { PassportTabs } from "@/components/passport-tabs";
import { PastVouchersSection } from "@/components/past-vouchers-section";
import { RedeemPointsRewardButton } from "@/components/redeem-points-reward-button";
import { ResendVerificationButton } from "@/components/resend-verification-button";
import { ReviewForm } from "@/components/review-form";
import { TrailStamps } from "@/components/trail-stamps";
import { VisitorQrCard } from "@/components/visitor-qr-card";
import { getTrailProgressForTraveller } from "@/lib/data/trails";
import { getAreaStamps, getStreakStatus, getWeeklyChallengeStatus } from "@/lib/data/check-ins";
import { STREAK_MILESTONES } from "@/lib/streaks";
import { LAUNCH_AREAS, STAMP_AREAS } from "@/lib/areas";
import { PASSPORT_TABS, type PassportTabKey } from "@/lib/passport-tabs";
import { getSession, type SessionPayload } from "@/lib/session";
import { claimDealFormAction } from "@/lib/actions/deal-actions";
import { getAllActiveDeals, getClaimedDealIds } from "@/lib/data/deals";
import { getReviewableBookings } from "@/lib/data/reviews";
import { withRlsContext } from "@/lib/db-context";
import { getMyWallet, getPointsShopCatalog, getRewardsSummary, getTierStatus } from "@/lib/data/rewards";
import { getPointsSummary, POINT_VALUE_MINOR } from "@/lib/data/points";
import { TierBadge } from "@/components/tier-badge";
import { ShareReferralBlock } from "@/components/share-referral-block";
import { VoucherCard } from "@/components/voucher-card";
import { formatRewardDiscount } from "@/lib/reward-format";
import {
  getCommentsForPost,
  getEngagementCounts,
  getLikedPostIds,
  getMyClubs,
  getPostImageIds,
  getPostsByTraveller,
  getSavedPostIds,
} from "@/lib/data/social";
import { resolvePostContexts, type PostContextType } from "@/lib/data/post-context";
import { PostsTab } from "@/components/posts-tab";
import {
  getPassportProgress,
  getSavedListingsForTraveller,
  getTravellerBookings,
  getTravellerProfileByUserId,
} from "@/lib/data/traveller";
import { getMyBlockedList } from "@/lib/data/moderation";
import { BlockedAccountsList } from "@/components/blocked-accounts-list";
import { PartnerCard } from "@/components/partner-card";
import { getBirthdayPerksForListings } from "@/lib/data/birthday";
import { getJourneyTagsForListings, getListingById } from "@/lib/data/journeys";
import { getListingImageIds } from "@/lib/data/listing-images";
import { getRatingSummaries } from "@/lib/data/reviews";

export default async function PassportPage({
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
          <p className="eyebrow text-ember">Wano Passport</p>
          <p className="font-serif-editorial text-2xl text-ink">Create your Wano Passport</p>
          <p className="text-sm text-ink/60">
            Collect stamps for every Wano Journey, save places, track bookings, and earn rewards —
            free to start.
          </p>
        </Link>
      </main>
    );
  }

  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return null;

  const [
    user,
    passportProgress,
    bookingRows,
    reviewableRows,
    rewardsSummary,
    tierStatus,
    pointsSummary,
    trailProgress,
    deals,
    claimedIds,
    postRows,
    blockedList,
    myClubs,
    savedListingRows,
    weeklyStatus,
    areaStamps,
    streak,
  ] = await Promise.all([
    db.select().from(users).where(eq(users.id, session.userId)).limit(1).then((r) => r[0]),
    getPassportProgress(travellerProfile.id),
    getTravellerBookings(travellerProfile.id),
    getReviewableBookings(travellerProfile.id),
    getRewardsSummary(travellerProfile.id, travellerProfile.persona, travellerProfile.city),
    getTierStatus(travellerProfile.id),
    getPointsSummary(travellerProfile.id),
    getTrailProgressForTraveller(travellerProfile.id),
    getAllActiveDeals(),
    getClaimedDealIds(travellerProfile.id),
    getPostsByTraveller(travellerProfile.id),
    getMyBlockedList(travellerProfile.id),
    getMyClubs(travellerProfile.id),
    getSavedListingsForTraveller(travellerProfile.id),
    getWeeklyChallengeStatus(travellerProfile.id),
    getAreaStamps(travellerProfile.id),
    getStreakStatus(travellerProfile.id),
  ]);

  const [wallet, pointsShopCatalog] = await withRlsContext(
    { userId: session.userId, role: "traveller", travellerProfileId: travellerProfile.id },
    (tx) => Promise.all([getMyWallet(travellerProfile.id, tx), getPointsShopCatalog(tx)]),
  );

  const postIds = postRows.map((r) => r.post.id);
  const [{ likeMap, commentMap }, likedPostIds, savedPostIds] = await Promise.all([
    getEngagementCounts(postIds),
    getLikedPostIds(travellerProfile.id, postIds),
    getSavedPostIds(travellerProfile.id, postIds),
  ]);
  const commentsByPost = await Promise.all(
    postRows.map((r) => getCommentsForPost(r.post.id).then((comments) => [r.post.id, comments] as const)),
  );
  const commentsMap = new Map(commentsByPost);
  const imageIdsMap = await getPostImageIds(postIds);
  const contextMap = await resolvePostContexts(
    postRows
      .filter((r) => r.post.contextType && r.post.contextId)
      .map((r) => ({ type: r.post.contextType as PostContextType, id: r.post.contextId as string })),
  );

  const reviewableBookingIds = new Set(reviewableRows.map((r) => r.booking.id));
  const { progress, stampCount, totalJourneys, grandPrizeQualified } = passportProgress;
  const unlockedJourneyIds = new Set(progress.filter((p) => p.earned).map((p) => p.journey.id));

  const savedItems = (
    await Promise.all(savedListingRows.map((s) => getListingById(s.listing.id)))
  ).filter((item) => item != null);
  const savedListingIds = savedItems.map((i) => i.listing.id);
  const [savedJourneyTags, savedRatings, savedBirthdayPerks, savedImages] = await Promise.all([
    getJourneyTagsForListings(savedListingIds),
    getRatingSummaries(savedListingIds),
    getBirthdayPerksForListings(savedListingIds),
    getListingImageIds(savedListingIds),
  ]);

  const defaultTab: PassportTabKey = stampCount > 0 ? "stamps" : bookingRows.length > 0 ? "bookings" : "stamps";
  const activeTab: PassportTabKey = PASSPORT_TABS.some((t) => t.key === tab)
    ? (tab as PassportTabKey)
    : defaultTab;

  const joined = user
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(user.createdAt))
    : null;

  return (
    <main className="font-editorial-body bg-paper mx-auto max-w-4xl px-4 py-8 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-none">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink/5 text-2xl font-semibold text-ink/70">
              {travellerProfile.displayName.charAt(0).toUpperCase()}
            </span>
            <Link
              href="/passport?tab=account"
              aria-label="Change profile photo"
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-paper bg-ink text-white"
            >
              <CameraIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div>
            <h1 className="font-serif-editorial text-2xl text-ink">
              {travellerProfile.displayName}
            </h1>
            <p className="text-sm text-ink/60">
              @{user?.username ?? "member"}
              {travellerProfile.city ? ` · ${travellerProfile.city}` : ""}
              {joined ? ` · Joined ${joined}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-none items-center gap-3">
          <TierBadge
            tier={tierStatus.tier}
            nextTier={tierStatus.nextTier}
            progressToNextTier={tierStatus.progressToNextTier}
            remainingToNextTier={tierStatus.remainingToNextTier}
          />
          <div className="border border-ink/10 bg-white px-4 py-2 text-right">
            <p className="font-mono-data text-lg font-semibold text-ember">{rewardsSummary.totalPoints}</p>
            <p className="eyebrow text-ink/40">XP</p>
          </div>
          <div className="border border-ink/10 bg-white px-4 py-2 text-right">
            <p className="font-mono-data text-lg font-semibold text-ink">{pointsSummary.balance}</p>
            <p className="eyebrow text-ink/40">points</p>
          </div>
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
            trailProgress={trailProgress}
            weeklyStatus={weeklyStatus}
            areaStamps={areaStamps}
            streak={streak}
          />
        )}
        {activeTab === "saved" && (
          <SavedTab
            items={savedItems}
            session={session}
            journeyTagsByListing={savedJourneyTags}
            ratings={savedRatings}
            birthdayPerks={savedBirthdayPerks}
            imagesByListing={savedImages}
            unlockedJourneyIds={unlockedJourneyIds}
          />
        )}
        {activeTab === "bookings" && (
          <BookingsTab bookingRows={bookingRows} reviewableBookingIds={reviewableBookingIds} />
        )}
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
        {activeTab === "posts" && (
          <PostsTab
            postRows={postRows}
            authorTravellerId={travellerProfile.id}
            authorName={travellerProfile.displayName}
            authorUsername={user?.username ?? null}
            authorAvatarUrl={user?.avatarUrl ?? null}
            authorLocation={travellerProfile.city}
            likeMap={likeMap}
            commentMap={commentMap}
            likedPostIds={likedPostIds}
            savedPostIds={savedPostIds}
            commentsMap={commentsMap}
            imageIdsMap={imageIdsMap}
            contextMap={contextMap}
            myClubs={myClubs}
          />
        )}
        {activeTab === "account" && (
          <AccountTab
            dateOfBirth={travellerProfile.dateOfBirth}
            showActivityInFeed={travellerProfile.showActivityInFeed}
            blockedList={blockedList}
            emailVerified={Boolean(user?.emailVerifiedAt)}
          />
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
  trailProgress,
  weeklyStatus,
  areaStamps,
  streak,
}: {
  progress: Awaited<ReturnType<typeof getPassportProgress>>["progress"];
  stampCount: number;
  totalJourneys: number;
  grandPrizeQualified: boolean;
  trailProgress: Awaited<ReturnType<typeof getTrailProgressForTraveller>>;
  weeklyStatus: Awaited<ReturnType<typeof getWeeklyChallengeStatus>>;
  areaStamps: string[];
  streak: Awaited<ReturnType<typeof getStreakStatus>>;
}) {
  const nextMilestone = STREAK_MILESTONES.find((m) => m.weeks > streak.current);
  const earned = new Set(areaStamps);
  const shownAreas = STAMP_AREAS.filter((a) => (LAUNCH_AREAS as readonly string[]).includes(a) || earned.has(a));
  return (
    <div className="space-y-6">
      <section className="border border-ink/10 bg-white p-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="eyebrow text-ember">This week</p>
          <Link href="/plans" className="text-sm font-semibold text-ember hover:underline">
            My plans →
          </Link>
        </div>
        <h2 className="font-serif-editorial mt-1 text-xl text-ink">Weekly challenges</h2>
        <p className="mt-1 text-sm text-ink/60">
          Show your Wano QR when you visit a partner. Staff scanning it is what counts, and new
          challenges arrive every Monday.
        </p>
        <Link href="/passport?tab=rewards" className="mt-2 inline-block text-sm text-ember hover:underline">
          Open my Wano QR →
        </Link>
        <ul className="mt-4 space-y-3">
          {weeklyStatus.map(({ challenge, progress, target, done }) => (
            <li key={challenge.id} className="border border-ink/10 p-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold text-ink">
                  {done && <span aria-hidden>✓ </span>}
                  {challenge.title}
                </p>
                <p className="font-mono-data shrink-0 text-xs text-ink/50">+{challenge.xp} XP</p>
              </div>
              <p className="mt-0.5 text-sm text-ink/60">{challenge.description}</p>
              <div className="mt-2 h-[3px] w-full bg-ink/10">
                <div
                  className={`h-full ${done ? "bg-emerald-600" : "bg-ember"}`}
                  style={{ width: `${Math.min(100, (progress / target) * 100)}%` }}
                />
              </div>
              <p className="font-mono-data mt-1 text-xs text-ink/50">
                {done ? "Done" : `${progress} / ${target}`}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section className="border border-ink/10 bg-white p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-serif-editorial text-xl text-ink">Weekly streak</h2>
          <p className="font-mono-data text-xs text-ink/50">Best {streak.best}</p>
        </div>
        <p className="font-serif-editorial mt-2 text-3xl text-ink">
          {streak.current} {streak.current === 1 ? "week" : "weeks"}
        </p>
        <p className="mt-1 text-sm text-ink/60">
          {streak.thisWeekDone ? "This week counts already." : "One verified visit any day this week keeps it going."}{" "}
          {streak.skipAvailable
            ? "You can miss one week a month without losing it."
            : "You've used this month's skip week."}
        </p>
        {nextMilestone && (
          <p className="font-mono-data mt-2 text-xs text-ink/50">
            {nextMilestone.weeks} weeks: +{nextMilestone.xp.toLocaleString()} XP
          </p>
        )}
      </section>
      <section className="border border-ink/10 bg-white p-6">
        <h2 className="font-serif-editorial text-xl text-ink">Neighbourhood stamps</h2>
        <p className="mt-1 text-sm text-ink/60">Your first verified visit in each area earns its stamp.</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {shownAreas.map((area) => (
            <li
              key={area}
              className={`rounded-full border px-3 py-1 text-sm ${
                earned.has(area) ? "border-ember bg-ember/10 text-ink" : "border-dashed border-ink/20 text-ink/40"
              }`}
            >
              {earned.has(area) ? "✓ " : ""}
              {area}
            </li>
          ))}
        </ul>
      </section>
      <div>
        <h2 className="font-serif-editorial text-2xl text-ink">Wano Passport</h2>
        <p className="mt-1 text-sm text-ink/60">
          Every Wano Journey you book stamps your Passport. Collect all {totalJourneys} for the grand
          prize draw.
        </p>
      </div>
      <section className="border border-ink/10 bg-white p-6">
        <PassportGrid progress={progress} />
        <div className="mt-6 h-[3px] w-full bg-ink/10">
          <div
            className="h-full bg-ember transition-all"
            style={{ width: `${(stampCount / totalJourneys) * 100}%` }}
          />
        </div>
        <p className="font-mono-data mt-2 text-sm text-ink/60">
          {stampCount} / {totalJourneys} stamps
        </p>
        <TrailStamps rows={trailProgress} />
      </section>
      <section
        className={`flex items-start gap-4 border p-5 ${
          grandPrizeQualified ? "border-ember bg-ink/5" : "border-ink/10 bg-white"
        }`}
      >
        <div>
          <p className="eyebrow text-ember">{grandPrizeQualified ? "Entered" : "Grand prize draw"}</p>
          <h3 className="font-serif-editorial mt-1 text-xl text-ink">
            {grandPrizeQualified ? "You're entered in the grand prize draw!" : "Grand prize draw"}
          </h3>
          <p className="mt-1 text-sm text-ink/70">
            {grandPrizeQualified
              ? "A free return trip, a final-match ticket, and a feature on official channels — good luck."
              : `Collect all ${totalJourneys} stamps to unlock your entry.`}
          </p>
        </div>
      </section>
    </div>
  );
}

function SavedTab({
  items,
  session,
  journeyTagsByListing,
  ratings,
  birthdayPerks,
  imagesByListing,
  unlockedJourneyIds,
}: {
  items: NonNullable<Awaited<ReturnType<typeof getListingById>>>[];
  session: SessionPayload;
  journeyTagsByListing: Awaited<ReturnType<typeof getJourneyTagsForListings>>;
  ratings: Awaited<ReturnType<typeof getRatingSummaries>>;
  birthdayPerks: Awaited<ReturnType<typeof getBirthdayPerksForListings>>;
  imagesByListing: Awaited<ReturnType<typeof getListingImageIds>>;
  unlockedJourneyIds: Set<string>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif-editorial text-2xl text-ink">Saved places</h2>
        <p className="mt-1 text-sm text-ink/60">
          Everywhere you&apos;ve tapped the heart on, in one list.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const tags = journeyTagsByListing.get(item.listing.id) ?? [];
          const unlocked = tags.length === 0 || tags.some((t) => unlockedJourneyIds.has(t.id));
          return (
            <PartnerCard
              key={item.listing.id}
              item={item}
              tags={tags}
              unlocked={unlocked}
              session={session}
              rating={ratings.get(item.listing.id)}
              saved
              birthdayPerk={birthdayPerks.get(item.listing.id)?.[0]}
              coverImageId={imagesByListing.get(item.listing.id)?.[0]}
            />
          );
        })}
        {items.length === 0 && (
          <div className="col-span-full border border-ink/10 bg-white p-8 text-center">
            <p className="text-ink">Nothing saved yet.</p>
            <p className="mt-1 text-sm text-ink/60">Tap the heart on any place to add it here.</p>
            <Link
              href="/explore"
              className="mt-4 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink/85"
            >
              Start exploring
            </Link>
          </div>
        )}
      </div>
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

function AccountTab({
  dateOfBirth,
  showActivityInFeed,
  blockedList,
  emailVerified,
}: {
  dateOfBirth: string | null;
  showActivityInFeed: boolean;
  blockedList: Awaited<ReturnType<typeof getMyBlockedList>>;
  emailVerified: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif-editorial text-2xl text-ink">Account</h2>
        <p className="mt-1 text-sm text-ink/60">Your profile, preferences, and security.</p>
      </div>

      {!emailVerified && (
        <section className="space-y-2 border border-ember/30 bg-ember/5 p-5">
          <h3 className="font-serif-editorial text-lg text-ink">Verify your email</h3>
          <p className="text-sm text-ink/60">
            You can browse Wano, but you&apos;ll need to verify your email before sending a booking
            request or earning referral rewards.
          </p>
          <ResendVerificationButton />
        </section>
      )}

      <section className="space-y-4 border border-ink/10 bg-white p-5">
        <h3 className="font-serif-editorial text-lg text-ink">Profile</h3>
        <BirthdayEditor dateOfBirth={dateOfBirth} />
      </section>

      <section className="space-y-4 border border-ink/10 bg-white p-5">
        <h3 className="font-serif-editorial text-lg text-ink">Preferences</h3>
        <LiteModeToggle />
        <FeedActivityToggle initialValue={showActivityInFeed} />
      </section>

      <section className="space-y-4 border border-ink/10 bg-white p-5">
        <h3 className="font-serif-editorial text-lg text-ink">Blocked accounts</h3>
        <BlockedAccountsList blockedList={blockedList} />
      </section>

      <div className="border border-ink/10 bg-white p-4 text-sm text-ink/70">
        <Link href="/community-guidelines" className="text-ink underline">
          Community Guidelines
        </Link>
        {" · "}
        <Link href="/privacy" className="text-ink underline">
          Privacy Policy
        </Link>
        {" · "}
        <Link href="/terms" className="text-ink underline">
          Terms of Service
        </Link>
      </div>

      <LogoutButton />
    </div>
  );
}
