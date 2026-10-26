import Link from "next/link";
import { PhoneVerifyInline } from "@/components/phone-verify-inline";
import { ResendVerificationButton } from "@/components/resend-verification-button";
import { VoucherCard } from "@/components/voucher-card";
import {
  checkDropIdentity,
  getDropNoShows,
  getHomeDrops,
  getHomeXpDrops,
  getMyDropVoucher,
  type DropView,
  type XpDropView,
} from "@/lib/data/drops";
import { getTravellerProfileByUserId } from "@/lib/data/traveller";
import { DROP_ANNOUNCE_HOUR, dropPausedUntil } from "@/lib/drops";
import { formatKampalaDateTime, formatKampalaTime, kampalaStartOfDay } from "@/lib/kampala-time";
import { formatRewardDiscount } from "@/lib/reward-format";
import { getSession } from "@/lib/session";
import { ClaimDropButton } from "./claim-drop-button";

export const metadata = { title: "Daily Drop · Wano" };

function windowLabel(drop: DropView) {
  return `${formatKampalaTime(drop.redeemFrom)} to ${formatKampalaTime(drop.redeemUntil)}`;
}

/** On days with no venue perk: XP for a verified visit in that day's area. */
function XpDropCard({ drop, when }: { drop: XpDropView; when: "Today" | "Tomorrow" }) {
  return (
    <article className="border border-ink/10 bg-white p-6">
      <p className="eyebrow text-ember">{when}&apos;s XP Drop · all day</p>
      <h2 className="font-serif-editorial mt-3 text-2xl text-ink">
        +{drop.xp} XP for a visit in {drop.area}
      </h2>
      <p className="mt-2 text-sm text-ink/70">
        Visit any Wano partner in {drop.area} and show your Wano QR. Nothing to claim, and it counts once per day.
      </p>
      <p className="mt-2 text-sm text-ink/60">Try {drop.venues.join(", ")}.</p>
      <Link href={`/explore?q=${encodeURIComponent(drop.area)}`} className="mt-4 inline-block text-sm font-semibold text-ember hover:underline">
        See partners in {drop.area} →
      </Link>
    </article>
  );
}

export default async function DropsPage() {
  const now = new Date();
  const [session, drops, xpDrops] = await Promise.all([getSession(), getHomeDrops(now), getHomeXpDrops(now)]);
  const traveller = session?.role === "traveller" ? await getTravellerProfileByUserId(session.userId) : null;

  const [identity, noShows] = traveller
    ? await Promise.all([checkDropIdentity(traveller.id), getDropNoShows(traveller.id, now)])
    : [null, []];
  const pausedUntil = traveller ? dropPausedUntil(noShows, now) : null;

  const list = [drops.today, drops.tomorrow].filter((d): d is DropView => d !== null);
  const vouchers = traveller
    ? await Promise.all(list.map((d) => getMyDropVoucher(traveller.id, d.rewardId, session!.userId)))
    : list.map(() => null);

  const announceToday = new Date(kampalaStartOfDay(now).getTime() + DROP_ANNOUNCE_HOUR * 60 * 60 * 1000);
  const beforeAnnouncement = now < announceToday;

  return (
    <main className="font-editorial-body bg-paper">
      <section className="mx-auto max-w-2xl px-4 py-12 md:px-6">
        <p className="eyebrow text-ember">Every day at 5 pm</p>
        <h1 className="font-serif-editorial mt-2 text-4xl text-ink">The Daily Drop</h1>
        <p className="mt-3 text-ink/60">
          One perk from a Kampala partner, announced at 5 pm for the next day so you can plan. The first people to
          claim it get a voucher to use at the venue. Using it earns Passport XP. On days without one, there&apos;s an XP Drop: Passport XP for a visit in that day&apos;s neighbourhood.
        </p>

        {traveller && identity && !identity.ok && (
          <div className="mt-8 border border-ink/10 bg-white p-5">
            <p className="text-sm font-semibold text-ink">
              {identity.need === "phone" ? "Verify your phone number to claim Drops" : "Verify your email to claim Drops"}
            </p>
            <p className="mt-1 text-sm text-ink/60">
              One account per person keeps Drops fair for everyone.
            </p>
            <div className="mt-3">{identity.need === "phone" ? <PhoneVerifyInline /> : <ResendVerificationButton />}</div>
          </div>
        )}

        {pausedUntil && (
          <div className="mt-8 border border-ink/10 bg-white p-5 text-sm text-ink/70">
            You claimed three Drops in the last 30 days without using them, so Drops are paused for you until{" "}
            {formatKampalaDateTime(pausedUntil)}. This keeps spots free for people who turn up.
          </div>
        )}

        <div className="mt-8 space-y-4">
          {list.map((drop, i) => {
            const voucher = vouchers[i];
            const left = Math.max(0, drop.cap - drop.claimed);
            const isToday = drop === drops.today;
            return (
              <article key={drop.dropId} className="border border-ink/10 bg-white p-6">
                <p className="eyebrow text-ember">
                  {isToday ? `Today's Drop · use it ${windowLabel(drop)}` : `Tomorrow's Drop · use it tomorrow ${windowLabel(drop)}`}
                </p>
                <h2 className="font-serif-editorial mt-3 text-2xl text-ink">{drop.title}</h2>
                <p className="mt-1 text-sm text-ink/60">
                  <Link href={`/explore/${drop.listingId}`} className="hover:text-ember">
                    {drop.listingTitle === drop.vendorName ? drop.vendorName : `${drop.listingTitle} · ${drop.vendorName}`}
                  </Link>
                </p>
                {drop.description && <p className="mt-3 text-sm text-ink/70">{drop.description}</p>}
                <p className="font-mono-data mt-4 text-xs uppercase tracking-wide text-ink/50">
                  {left} of {drop.cap} left
                </p>

                <div className="mt-4">
                  {voucher && voucher.status !== "void" ? (
                    <div className="space-y-2">
                      <p className="text-sm text-ink/70">
                        {isToday
                          ? "You're in. Show this at the venue before it closes."
                          : "You're in. Your voucher works tomorrow during the window above."}
                      </p>
                      <VoucherCard
                        userRewardId={voucher.id}
                        title={drop.title}
                        discountLabel={formatRewardDiscount(drop.discountType, drop.discountValue)}
                        redemptionCode={voucher.redemptionCode}
                        expiresAt={voucher.expiresAt.toISOString()}
                        targetHref={`/explore/${drop.listingId}`}
                        targetTitle={drop.listingTitle}
                      />
                    </div>
                  ) : left === 0 ? (
                    <p className="text-sm text-ink/60">All gone. The next Drop is announced at 5 pm.</p>
                  ) : !session ? (
                    <Link
                      href="/login?next=/drops"
                      className="inline-block rounded-full bg-ember px-5 py-2.5 text-sm font-semibold text-white"
                    >
                      Sign in to claim
                    </Link>
                  ) : traveller && identity?.ok && !pausedUntil ? (
                    <ClaimDropButton dropId={drop.dropId} label="Claim my spot" />
                  ) : null}
                </div>
              </article>
            );
          })}

          {xpDrops.today && <XpDropCard drop={xpDrops.today} when="Today" />}
          {xpDrops.tomorrow && <XpDropCard drop={xpDrops.tomorrow} when="Tomorrow" />}

          {!drops.tomorrow && !xpDrops.tomorrow && (
            <div className="border border-dashed border-ink/20 px-6 py-8 text-center text-sm text-ink/60">
              {beforeAnnouncement
                ? "Tomorrow's Drop is announced at 5 pm today."
                : "No Drop tomorrow. The next one is announced at 5 pm."}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
