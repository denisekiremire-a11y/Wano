import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { BirthdayEditor } from "@/components/birthday-editor";
import { LiteModeToggle } from "@/components/lite-mode-toggle";
import { OfferTeaser } from "@/components/offer-teaser";
import { PassportGrid } from "@/components/passport-grid";
import { RatingBadge } from "@/components/rating-badge";
import { TrophyIcon, UserIcon } from "@/components/icons";
import { logoutAction } from "@/lib/actions/auth-actions";
import { ChallengeCard } from "@/app/dashboard/challenges/challenge-card";
import { claimDealFormAction } from "@/lib/actions/deal-actions";
import { requireRole } from "@/lib/auth";
import { getAllActiveDeals, getClaimedDealIds } from "@/lib/data/deals";
import { getReviewsByTraveller } from "@/lib/data/reviews";
import { getFollowCounts } from "@/lib/data/social";
import {
  getActivePromoCodesForTraveller,
  getChallengesWithStatus,
  getPassportProgress,
  getReferralStats,
  getSavedListingsForTraveller,
  getTravellerProfileByUserId,
  getUnlockedOffersForTraveller,
} from "@/lib/data/traveller";

const TABS = [
  { key: "passport", label: "Passport" },
  { key: "deals", label: "Deals" },
  { key: "challenges", label: "Challenges" },
  { key: "reviews", label: "Reviews" },
  { key: "saved", label: "Saved" },
  { key: "settings", label: "Settings" },
] as const;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; booked?: string; journey?: string }>;
}) {
  const session = await requireRole("traveller");
  const { tab, booked, journey } = await searchParams;
  const activeTab = TABS.some((t) => t.key === tab) ? tab! : "passport";

  const travellerProfile = await getTravellerProfileByUserId(session.userId);
  if (!travellerProfile) return null;

  const [user, followCounts, { progress, stampCount, totalJourneys, grandPrizeQualified }] =
    await Promise.all([
      db.select().from(users).where(eq(users.id, session.userId)).limit(1).then((r) => r[0]),
      getFollowCounts(travellerProfile.id),
      getPassportProgress(travellerProfile.id),
    ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-forest-100 text-forest-500">
          <UserIcon className="h-8 w-8" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest-900">
            {travellerProfile.displayName}
          </h1>
          <p className="text-sm text-forest-800/60">
            @{user?.username ?? "member"} · {followCounts.followers} followers ·{" "}
            {followCounts.following} following
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-forest-900/10 bg-white p-4">
        <BirthdayEditor dateOfBirth={travellerProfile.dateOfBirth} />
      </div>

      {booked && (
        <div className="mt-6 rounded-xl border border-forest-300 bg-forest-50 p-4 text-sm text-forest-800">
          <p className="font-medium">Booking request sent — ref {booked}</p>
          <p>
            {journey
              ? `The business will confirm your request shortly. Your ${journey} stamp lands the moment they do.`
              : "The business will confirm your request shortly. This one isn't tied to a Wano Journey, so no Passport stamp either way."}
          </p>
        </div>
      )}

      <nav className="mt-6 flex gap-1 overflow-x-auto rounded-full bg-forest-50 p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/profile?tab=${t.key}`}
            className={`flex-none rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              activeTab === t.key ? "bg-forest-800 text-white" : "text-forest-800/70"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        {activeTab === "passport" && (
          <PassportTab
            progress={progress}
            stampCount={stampCount}
            totalJourneys={totalJourneys}
            grandPrizeQualified={grandPrizeQualified}
          />
        )}
        {activeTab === "deals" && <DealsTab travellerId={travellerProfile.id} />}
        {activeTab === "challenges" && <ChallengesTab travellerId={travellerProfile.id} />}
        {activeTab === "reviews" && <ReviewsTab travellerId={travellerProfile.id} />}
        {activeTab === "saved" && <SavedTab travellerId={travellerProfile.id} />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
    </main>
  );
}

function SettingsTab() {
  return (
    <div className="space-y-3">
      <LiteModeToggle />
      <div className="rounded-xl border border-forest-900/10 bg-white p-4 text-sm text-forest-800/70">
        <Link href="/privacy" className="text-forest-900 underline">
          Privacy Policy
        </Link>
        {" · "}
        <Link href="/terms" className="text-forest-900 underline">
          Terms of Service
        </Link>
      </div>
      <form action={logoutAction}>
        <button
          type="submit"
          className="w-full rounded-full border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        >
          Log out
        </button>
      </form>
    </div>
  );
}

function PassportTab({
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

async function DealsTab({ travellerId }: { travellerId: string }) {
  const [journeysWithOffers, promoCodes, allDeals, claimedIds] = await Promise.all([
    getUnlockedOffersForTraveller(travellerId),
    getActivePromoCodesForTraveller(travellerId),
    getAllActiveDeals(),
    getClaimedDealIds(travellerId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-forest-900">Wano Deals</h2>
        <p className="mt-1 text-sm text-forest-800/60">
          Booking a journey unlocks that journey&apos;s member offers. Claim any platform-wide deal
          below to add it to your list.
        </p>
      </div>

      {promoCodes.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-display text-lg font-semibold text-forest-900">Wano promotions</h3>
          {promoCodes.map(({ promo }) => (
            <div key={promo.id} className="rounded-2xl border border-marigold-300 bg-marigold-50 p-4">
              <p className="font-mono text-sm font-semibold text-marigold-900">{promo.code}</p>
              <p className="text-sm font-medium text-forest-900">{promo.title}</p>
              <p className="text-sm text-forest-800/70">
                {promo.discountText}
                {promo.freebieText ? ` + ${promo.freebieText}` : ""}
              </p>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-forest-900">All active deals</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {allDeals.map(({ promo, listing, vendor }) => {
            const claimed = claimedIds.has(promo.id);
            return (
              <div key={promo.id} className="rounded-xl border border-forest-900/10 bg-white p-4">
                <p className="font-mono text-xs font-semibold text-marigold-700">{promo.code}</p>
                <p className="text-sm font-medium text-forest-900">{promo.title}</p>
                <p className="text-xs text-forest-800/60">
                  {listing ? `${listing.title} · ${vendor?.businessName}` : "Platform-wide"}
                </p>
                <p className="mt-1 text-sm text-forest-800/70">{promo.discountText}</p>
                <form action={claimDealFormAction}>
                  <input type="hidden" name="promoCodeId" value={promo.id} />
                  <button
                    type="submit"
                    disabled={claimed}
                    className="mt-2 rounded-full bg-forest-800 px-3 py-1.5 text-xs font-semibold text-white disabled:bg-forest-100 disabled:text-forest-500"
                  >
                    {claimed ? "Claimed" : "Claim deal"}
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-forest-900">By journey</h3>
        {journeysWithOffers.map(({ journey, unlocked, offers }) => (
          <details key={journey.id} className="rounded-xl border border-forest-900/10 bg-white p-4">
            <summary className="cursor-pointer font-medium text-forest-900">
              {journey.name} — {unlocked ? "unlocked" : "locked"}
            </summary>
            <div className="mt-3 space-y-2">
              {offers.map(({ listing, offer }) =>
                offer ? (
                  <div key={listing.id}>
                    <p className="text-sm font-medium text-forest-900">{listing.title}</p>
                    <OfferTeaser
                      discountText={offer.discountText}
                      freebieText={offer.freebieText}
                      unlocked={unlocked}
                      unlockHint="Book this journey to unlock"
                      unlockHref={`/journeys/${journey.slug}`}
                    />
                  </div>
                ) : null,
              )}
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}

async function ChallengesTab({ travellerId }: { travellerId: string }) {
  const [challengeRows, referralStats] = await Promise.all([
    getChallengesWithStatus(travellerId),
    getReferralStats(travellerId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-forest-900">Challenges</h2>
        <p className="mt-1 text-sm text-forest-800/60">
          Complete challenges for bonus perks and a boost toward the grand prize.
        </p>
      </div>
      <div className="space-y-3">
        {challengeRows.map(({ challenge, completion }) => (
          <ChallengeCard
            key={challenge.id}
            challengeId={challenge.id}
            title={challenge.title}
            description={challenge.description}
            rewardText={challenge.rewardText}
            completed={completion?.status === "verified"}
            referral={
              challenge.key === "refer-a-friend" && referralStats.referralCode
                ? { code: referralStats.referralCode, count: referralStats.referredCount }
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

async function ReviewsTab({ travellerId }: { travellerId: string }) {
  const rows = await getReviewsByTraveller(travellerId);
  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-semibold text-forest-900">Your reviews</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-forest-800/60">
          You haven&apos;t reviewed anything yet — reviews unlock after a completed booking.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map(({ review, listing }) => (
            <div key={review.id} className="rounded-xl border border-forest-900/10 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-forest-900">{listing.title}</p>
                <RatingBadge average={review.rating} count={1} />
              </div>
              {review.comment && <p className="mt-1 text-sm text-forest-800/70">{review.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function SavedTab({ travellerId }: { travellerId: string }) {
  const rows = await getSavedListingsForTraveller(travellerId);
  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-semibold text-forest-900">Saved places</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-forest-800/60">
          Tap the heart on any place in{" "}
          <Link href="/explore" className="font-medium text-nile-700 hover:underline">
            Explore
          </Link>{" "}
          to save it here.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map(({ listing, vendor }) => (
            <div key={listing.id} className="rounded-xl border border-forest-900/10 bg-white p-4">
              <p className="font-medium text-forest-900">{listing.title}</p>
              <p className="text-sm text-forest-800/60">{vendor.businessName}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
