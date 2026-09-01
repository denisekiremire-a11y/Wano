import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { CameraIcon, UserIcon } from "@/components/icons";
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

  const [user, { stampCount }, bookingRows, rewardsSummary] = await Promise.all([
    db.select().from(users).where(eq(users.id, session.userId)).limit(1).then((r) => r[0]),
    getPassportProgress(travellerProfile.id),
    getTravellerBookings(travellerProfile.id),
    getRewardsSummary(travellerProfile.id, travellerProfile.persona, travellerProfile.city),
  ]);

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
        <PlaceholderPanel title={PASSPORT_TABS.find((t) => t.key === activeTab)!.label} />
      </div>
    </main>
  );
}

function PlaceholderPanel({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-forest-900/15 bg-white p-8 text-center text-sm text-forest-800/60">
      {title} content is moving in here next.
    </div>
  );
}
