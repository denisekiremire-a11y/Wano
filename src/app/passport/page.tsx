import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { CameraIcon, TrophyIcon, UserIcon } from "@/components/icons";
import { PassportGrid } from "@/components/passport-grid";
import { PassportTabs } from "@/components/passport-tabs";
import { PASSPORT_TABS, type PassportTabKey } from "@/lib/passport-tabs";
import { requireRole } from "@/lib/auth";
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

  const [user, passportProgress, bookingRows, rewardsSummary] = await Promise.all([
    db.select().from(users).where(eq(users.id, session.userId)).limit(1).then((r) => r[0]),
    getPassportProgress(travellerProfile.id),
    getTravellerBookings(travellerProfile.id),
    getRewardsSummary(travellerProfile.id, travellerProfile.persona, travellerProfile.city),
  ]);
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
        {activeTab === "stamps" ? (
          <StampsTab
            progress={progress}
            stampCount={stampCount}
            totalJourneys={totalJourneys}
            grandPrizeQualified={grandPrizeQualified}
          />
        ) : (
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

function PlaceholderPanel({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-forest-900/15 bg-white p-8 text-center text-sm text-forest-800/60">
      {title} content is moving in here next.
    </div>
  );
}
